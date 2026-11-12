import { useMemo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { create } from 'zustand'
import clsx from 'clsx'
import axios from 'axios'
import {
  Bell,
  Bike,
  CarFront,
  CheckCircle2,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const ROLES = ['ADMIN', 'DRIVER', 'CUSTOMER', 'REVIEWER', 'SUPPORT', 'FINANCE'] as const
const roleColors: Record<Role, string> = {
  ADMIN: 'bg-emerald-600',
  DRIVER: 'bg-amber-500',
  CUSTOMER: 'bg-sky-500',
  REVIEWER: 'bg-violet-500',
  SUPPORT: 'bg-rose-500',
  FINANCE: 'bg-indigo-500',
}

type Role = (typeof ROLES)[number]

type LoginInput = {
  username: string
  password: string
  role: Role
}

type AuthApiPayload = {
  accessToken: string
  tokenType: string
  refreshToken: string
}

type AuthState = {
  isAuthenticated: boolean
  role: Role | null
  name: string
  login: (payload: LoginInput) => Promise<void>
  logout: () => void
}

const gatewayBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

const gatewayClient = axios.create({
  baseURL: gatewayBaseUrl,
  timeout: 10000,
})

async function loginWithGateway(username: string, password: string): Promise<AuthApiPayload> {
  const response = await gatewayClient.post('/api/v1/auth/login', {
    username,
    password,
  })

  const payload = response.data?.data ?? response.data
  if (!payload?.accessToken) {
    throw new Error('Gateway did not return an access token.')
  }

  localStorage.setItem('fakegrab.accessToken', payload.accessToken)
  localStorage.setItem('fakegrab.refreshToken', payload.refreshToken ?? '')

  return payload as AuthApiPayload
}

const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  name: '',
  login: async ({ role, username, password }) => {
    const payload = await loginWithGateway(username, password)
    set({
      isAuthenticated: Boolean(payload.accessToken),
      role,
      name: username || 'Operator',
    })
  },
  logout: () => {
    localStorage.removeItem('fakegrab.accessToken')
    localStorage.removeItem('fakegrab.refreshToken')
    set({ isAuthenticated: false, role: null, name: '' })
  },
}))

const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(ROLES),
})

type UserApi = {
  userId: number
  loginIdentifier: string
  role?: string
  status?: string
  lastLoginAt?: string
}

type DriverApi = {
  driverId: number
  reviewStatus?: string
  availabilityStatus?: string
  statusReason?: string
  reviewedAt?: string
  createdAt?: string
}

type TripApi = {
  tripId: number
  tripCode?: string
  type?: string
  status?: string
  customerId?: number
  driverId?: number
  estimatedFare?: number | string
  finalFare?: number | string
  createdAt?: string
  updatedAt?: string
}

type WalletApi = {
  walletId: number
  driverId: number
  currency?: string
  status?: string
  derivedBalance?: number | string
}

type AuditApi = {
  auditId?: string
  action?: string
  actor?: string
  createdAt?: string
  eventType?: string
}

async function getApiData<T>(path: string): Promise<T> {
  const response = await gatewayClient.get(path)
  const payload = response.data?.data ?? response.data
  return (Array.isArray(payload) || payload && typeof payload === 'object' ? payload : []) as T
}

const statusPalette: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  'In Trip': 'bg-sky-100 text-sky-700',
  'IN_PROGRESS': 'bg-sky-100 text-sky-700',
  Review: 'bg-amber-100 text-amber-700',
  'Awaiting Review': 'bg-violet-100 text-violet-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Priority: 'bg-rose-100 text-rose-700',
  Offline: 'bg-slate-200 text-slate-700',
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  UNAVAILABLE: 'bg-slate-200 text-slate-700',
  REQUESTED: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-violet-100 text-violet-700',
  SCHEDULED: 'bg-sky-100 text-sky-700',
}

const dashboardRevenue = [
  { day: 'Mon', value: 2400 },
  { day: 'Tue', value: 3300 },
  { day: 'Wed', value: 2900 },
  { day: 'Thu', value: 4200 },
  { day: 'Fri', value: 4800 },
  { day: 'Sat', value: 5600 },
  { day: 'Sun', value: 6100 },
]

const tripBreakdown = [
  { name: 'Bike', value: 42, color: '#00AA6C' },
  { name: 'Car', value: 38, color: '#102A22' },
  { name: 'Delivery', value: 20, color: '#A7F3D0' },
]

const driverRows = [
  { name: 'Anh Tran', rider: 'BMX-203', location: 'District 7', status: 'Active', rating: 4.9, earnings: '$540' },
  { name: 'Minh Le', rider: 'BMX-118', location: 'Binh Thanh', status: 'In Trip', rating: 4.8, earnings: '$350' },
  { name: 'Khanh Ho', rider: 'CXR-902', location: 'Tan Binh', status: 'Offline', rating: 4.7, earnings: '$216' },
]

const tripRows = [
  { id: '#FG-1024', rider: 'Nguyen T.', pickup: 'District 1', dropoff: 'Phu Nhuan', fare: '$18.50', status: 'In Trip' },
  { id: '#FG-1039', rider: 'Le H.', pickup: 'Thu Duc', dropoff: 'District 7', fare: '$24.20', status: 'Approved' },
  { id: '#FG-1045', rider: 'Nhi D.', pickup: 'Go Vap', dropoff: 'Binh Chanh', fare: '$32.00', status: 'Review' },
]

const supportTickets = [
  { id: 'SUP-247', customer: 'Viet Pham', issue: 'Driver did not arrive within expected ETA', status: 'Priority', updated: '2 min ago' },
  { id: 'SUP-251', customer: 'Linh Hoang', issue: 'Need refund for duplicate trip payment', status: 'Review', updated: '12 min ago' },
  { id: 'SUP-269', customer: 'Tuong N.', issue: 'Vehicle document verification rejected', status: 'Resolved', updated: '1 hour ago' },
]

const auditTrail = [
  { time: '09:10', action: 'Driver K12 account verified', actor: 'Reviewer Team' },
  { time: '11:25', action: 'Pricing rule updated for city peak surcharge', actor: 'Finance Ops' },
  { time: '14:00', action: 'Customer refund approved', actor: 'Support Desk' },
]

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Drivers', to: '/drivers', icon: Users },
  { label: 'Trips', to: '/trips', icon: MapPinned },
  { label: 'Finance', to: '/finance', icon: Wallet },
  { label: 'Support', to: '/support', icon: MessageSquareText },
  { label: 'Audit', to: '/audit', icon: FileText },
  { label: 'Settings', to: '/settings', icon: Settings },
]

function getRoleNavItems(role: Role | null) {
  if (role === 'DRIVER') {
    return [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Trips', to: '/trips', icon: MapPinned },
      { label: 'Support', to: '/support', icon: MessageSquareText },
      { label: 'Settings', to: '/settings', icon: Settings },
    ]
  }

  if (role === 'CUSTOMER') {
    return [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Trips', to: '/trips', icon: MapPinned },
      { label: 'Support', to: '/support', icon: MessageSquareText },
      { label: 'Settings', to: '/settings', icon: Settings },
    ]
  }

  return navItems
}

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout><DashboardPage /></AppLayout>} />
            <Route path="/drivers" element={<AppLayout><DriversPage /></AppLayout>} />
            <Route path="/trips" element={<AppLayout><TripsPage /></AppLayout>} />
            <Route path="/finance" element={<AppLayout><FinancePage /></AppLayout>} />
            <Route path="/support" element={<AppLayout><SupportPage /></AppLayout>} />
            <Route path="/audit" element={<AppLayout><AuditPage /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!role) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function AppLayout({ children }: { children: ReactNode }) {
  const role = useAuthStore((state) => state.role)
  const name = useAuthStore((state) => state.name)
  const logout = useAuthStore((state) => state.logout)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-[#102A22] p-6 text-white lg:block">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">FakeGrab</div>
              <div className="mt-1 text-2xl font-bold">Operator HQ</div>
            </div>
            <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-100">Live</div>
          </div>

          <nav className="space-y-2">
            {getRoleNavItems(role).map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-100">Mock mode</span>
              <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100">Enabled</span>
            </div>
            <p className="mt-2 text-sm text-emerald-50/80">Frontend is wired for API replacement without touching the UI flow.</p>
          </div>
        </aside>

        <main className="flex-1 p-4 lg:p-8">
          <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operations</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">FakeGrab platform</h1>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-full border border-slate-200 p-2.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100">
                <Bell size={18} />
              </button>
              <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">{name.slice(0, 1).toUpperCase()}</div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-slate-800">{name}</div>
                  <div className="text-xs text-slate-500">{role}</div>
                </div>
              </div>
              <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  )
}

function DashboardPage() {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => getApiData<UserApi[]>('/api/v1/users'),
    retry: false,
    staleTime: 60_000,
  })

  const driversQuery = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getApiData<DriverApi[]>('/api/v1/drivers/profile'),
    retry: false,
    staleTime: 60_000,
  })

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: () => getApiData<TripApi[]>('/api/v1/drivers/trips'),
    retry: false,
    staleTime: 60_000,
  })

  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: () => getApiData<WalletApi[]>('/api/v1/drivers/wallet'),
    retry: false,
    staleTime: 60_000,
  })

  const liveMode = !usersQuery.isError && !driversQuery.isError && !tripsQuery.isError && !walletsQuery.isError
  const role = useAuthStore((state) => state.role)

  const metrics = useMemo(() => {
    const tripCount = Array.isArray(tripsQuery.data) ? tripsQuery.data.length : 0
    const activeDrivers = Array.isArray(driversQuery.data)
      ? driversQuery.data.filter((driver) => String(driver.availabilityStatus ?? '').toUpperCase() === 'AVAILABLE').length
      : 0
    const revenue = Array.isArray(walletsQuery.data)
      ? walletsQuery.data.reduce((sum, wallet) => sum + Number(wallet.derivedBalance ?? 0), 0)
      : 0

    return [
      { label: 'Today trips', value: tripCount || 1842, delta: '+12.8%' },
      { label: 'Active drivers', value: activeDrivers || 314, delta: '+9.1%' },
      { label: 'Completion rate', value: tripCount > 0 ? '96.4%' : '96.4%', delta: '+2.4%' },
      { label: 'Gross revenue', value: revenue > 0 ? `$${revenue.toLocaleString()}` : '$68.4k', delta: '+18.6%' },
    ]
  }, [driversQuery.data, tripsQuery.data, walletsQuery.data])

  const tripRows = Array.isArray(tripsQuery.data) && tripsQuery.data.length > 0
    ? tripsQuery.data.slice(0, 3).map((trip) => ({
        id: trip.tripCode || `#FG-${trip.tripId}`,
        rider: `Customer ${trip.customerId ?? 'N/A'}`,
        pickup: 'Operational route',
        dropoff: 'Destination route',
        fare: `$${Number(trip.finalFare ?? trip.estimatedFare ?? 0).toFixed(2)}`,
        status: String(trip.status ?? 'REQUESTED'),
      }))
    : [
        { id: '#FG-1024', rider: 'Nguyen T.', pickup: 'District 1', dropoff: 'Phu Nhuan', fare: '$18.50', status: 'In Trip' },
        { id: '#FG-1039', rider: 'Le H.', pickup: 'Thu Duc', dropoff: 'District 7', fare: '$24.20', status: 'Approved' },
        { id: '#FG-1045', rider: 'Nhi D.', pickup: 'Go Vap', dropoff: 'Binh Chanh', fare: '$32.00', status: 'Review' },
      ]

  if (role === 'DRIVER') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Driver cockpit</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Vehicle readiness and trip status</h2>
            </div>
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Online • Available</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Trips today', value: '18', delta: '+3.2%' },
            { label: 'Acceptance rate', value: '94.8%', delta: '+2.1%' },
            { label: 'Earnings', value: '$820', delta: '+$120' },
            { label: 'Rating', value: '4.9', delta: '+0.2' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{metric.delta}</span>
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{metric.value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Dispatch</p>
                <h2 className="text-xl font-semibold text-slate-900">Assigned trips</h2>
              </div>
              <button type="button" className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">Toggle available</button>
            </div>
            <div className="space-y-3">
              {tripRows.map((trip) => (
                <div key={trip.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{trip.id}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[trip.status] ?? 'bg-slate-100 text-slate-700'}`}>{trip.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{trip.pickup} → {trip.dropoff}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{trip.rider}</span>
                    <span>{trip.fare}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Vehicle</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Maintenance</h2>
            <div className="mt-5 space-y-4">
              {[
                { label: 'Fuel status', value: '72%', tone: 'emerald' },
                { label: 'Document expiry', value: '12 days', tone: 'amber' },
                { label: 'Last service', value: '3 weeks ago', tone: 'sky' },
              ].map(({ label, value, tone }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${tone === 'emerald' ? 'bg-emerald-100 text-emerald-700' : tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (role === 'CUSTOMER') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Customer portal</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Your rides and service health</h2>
            </div>
            <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">Member • Gold</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Trips booked', value: '24', delta: '+6.7%' },
            { label: 'Avg. spend', value: '$58', delta: '+$8' },
            { label: 'On-time rate', value: '96.4%', delta: '+2.1%' },
            { label: 'Support tickets', value: '2', delta: 'Resolved' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{metric.label}</div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{metric.value}</div>
              <div className="mt-2 text-xs font-medium text-emerald-700">{metric.delta}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Recent bookings</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Current itinerary</h2>
            <div className="mt-5 space-y-3">
              {tripRows.map((trip) => (
                <div key={trip.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{trip.id}</span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[trip.status] ?? 'bg-slate-100 text-slate-700'}`}>{trip.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{trip.pickup} → {trip.dropoff}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{trip.rider}</span>
                    <span>{trip.fare}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Saved options</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Payment and support</h2>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Preferred payment', value: 'Visa •••• 5281' },
                { label: 'Driver preference', value: 'Same driver if available' },
                { label: 'Support chat', value: 'Open case #C-2042' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-[0.15em] text-slate-400">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (role === 'SUPPORT') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Support desk</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Queue overview and response SLA</h2>
            </div>
            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">Priority queue</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Open tickets', value: '18', delta: '8 urgent' },
            { label: 'Resolved today', value: '32', delta: '98.2% SLA' },
            { label: 'Avg. response', value: '9 min', delta: 'Within target' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{metric.label}</div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{metric.value}</div>
              <div className="mt-2 text-xs font-medium text-slate-600">{metric.delta}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Queue</p>
            <h2 className="text-xl font-semibold text-slate-900">Customer escalations</h2>
          </div>
          <div className="space-y-3">{supportTickets.map((ticket) => (
            <div key={ticket.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{ticket.id}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[ticket.status] ?? 'bg-slate-100 text-slate-700'}`}>{ticket.status}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">{ticket.customer}</div>
                <p className="mt-1 text-sm text-slate-700">{ticket.issue}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} />{ticket.updated}</div>
            </div>
          ))}</div>
        </div>
      </div>
    )
  }

  if (role === 'FINANCE') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Finance</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Payout and settlement overview</h2>
            </div>
            <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">Settlement batch 04</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Gross', value: '$68.9k' },
            { label: 'Payouts', value: '$49.2k' },
            { label: 'Fees', value: '$3.1k' },
            { label: 'Net', value: '$16.5k' },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Cashflows</p>
            <h2 className="text-xl font-semibold text-slate-900">Driver settlements</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardRevenue}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="value" fill="#4F46E5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  if (role === 'REVIEWER') {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Reviewer</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Compliance and quality review queue</h2>
            </div>
            <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">12 pending checks</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: 'Manual reviews', value: '18', delta: '7 high risk' },
            { label: 'Approved today', value: '59', delta: '+12.4%' },
            { label: 'Escalations', value: '4', delta: '2 critical' },
          ].map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{metric.label}</div>
              <div className="mt-4 text-3xl font-bold text-slate-900">{metric.value}</div>
              <div className="mt-2 text-xs font-medium text-slate-600">{metric.delta}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-sm text-slate-500">Review queue</p>
            <h2 className="text-xl font-semibold text-slate-900">Documents and operational cases</h2>
          </div>
          <div className="space-y-3">
            {supportTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{ticket.id}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[ticket.status] ?? 'bg-slate-100 text-slate-700'}`}>{ticket.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{ticket.customer}</p>
                <p className="mt-1 text-sm text-slate-700">{ticket.issue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Backend status</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{liveMode ? 'Connected to FakeGrab microservices' : 'Fallback mode: backend unavailable or not running'}</h2>
          </div>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${liveMode ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {liveMode ? 'Live API' : 'Mock-safe fallback'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{metric.label}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                <TrendingUp size={12} />
                {metric.delta}
              </span>
            </div>
            <div className="mt-4 text-3xl font-bold text-slate-900">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Revenue overview</p>
              <h2 className="text-xl font-semibold text-slate-900">Weekly earnings</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">
              <Plus size={15} />
              Export report
            </button>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardRevenue}>
                <defs>
                  <linearGradient id="moneyFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#00AA6C" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#00AA6C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#00AA6C" fill="url(#moneyFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Trip mix</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Service composition</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tripBreakdown} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={4}>
                  {tripBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 pt-2">
            {tripBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </div>
                <span className="font-semibold text-slate-800">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Operations board</p>
              <h2 className="text-xl font-semibold text-slate-900">Live trip queue</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Search size={15} />
              Search requests
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Trip ID</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Route</th>
                  <th className="pb-3 pr-4 font-medium">Fare</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tripRows.map((trip) => (
                  <tr key={trip.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-slate-800">{trip.id}</td>
                    <td className="py-3 pr-4 text-slate-600">{trip.rider}</td>
                    <td className="py-3 pr-4 text-slate-600">{trip.pickup} → {trip.dropoff}</td>
                    <td className="py-3 pr-4 text-slate-600">{trip.fare}</td>
                    <td className="py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[trip.status] ?? 'bg-slate-100 text-slate-700'}`}>{trip.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Network health</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Service status</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Driver response time', value: '1m 42s', icon: Clock3 },
              { label: 'Ride acceptance rate', value: '94.7%', icon: CheckCircle2 },
              { label: 'Support SLA', value: '99.2%', icon: ShieldCheck },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Icon size={16} /></div>
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DriversPage() {
  const driversQuery = useQuery({
    queryKey: ['drivers'],
    queryFn: () => getApiData<DriverApi[]>('/api/v1/drivers/profile'),
    retry: false,
    staleTime: 60_000,
  })

  const rows = Array.isArray(driversQuery.data) && driversQuery.data.length > 0
    ? driversQuery.data.map((driver) => ({
        name: `Driver ${driver.driverId}`,
        rider: driver.statusReason ?? 'Vehicle profile',
        location: 'Fleet monitoring',
        status: String(driver.availabilityStatus ?? 'UNAVAILABLE'),
        rating: 4.8,
        earnings: '$0.00',
      }))
    : driverRows

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Fleet</p>
          <h2 className="text-xl font-semibold text-slate-900">Driver performance</h2>
        </div>
        <button type="button" className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500">Add driver</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-3 pr-4 font-medium">Driver</th>
              <th className="pb-3 pr-4 font-medium">Vehicle</th>
              <th className="pb-3 pr-4 font-medium">Location</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Rating</th>
              <th className="pb-3 font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((driver) => (
              <tr key={`${driver.name}-${driver.rider}`} className="border-b border-slate-100 last:border-b-0">
                <td className="py-3 pr-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">{driver.name.split(' ').map((part) => part[0]).slice(0,2).join('')}</div><div><div className="font-medium text-slate-800">{driver.name}</div><div className="text-xs text-slate-500">Online since 06:30</div></div></div></td>
                <td className="py-3 pr-4 text-slate-600">{driver.rider}</td>
                <td className="py-3 pr-4 text-slate-600">{driver.location}</td>
                <td className="py-3 pr-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[driver.status] ?? 'bg-slate-100 text-slate-700'}`}>{driver.status}</span></td>
                <td className="py-3 pr-4"><span className="inline-flex items-center gap-1 text-slate-700"><Star size={14} className="fill-amber-400 text-amber-400" />{driver.rating}</span></td>
                <td className="py-3 font-semibold text-slate-800">{driver.earnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const tripSchema = z.object({
  tripType: z.enum(['Bike ride', 'Car ride', 'Bike delivery', 'Car delivery']),
  pickup: z.string().min(2, 'Pickup is required.'),
  destination: z.string().min(2, 'Destination is required.'),
  riderName: z.string().min(2, 'Rider name is required.'),
})

type TripFormValues = z.infer<typeof tripSchema>

function TripsPage() {
  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: () => getApiData<TripApi[]>('/api/v1/drivers/trips'),
    retry: false,
    staleTime: 60_000,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      tripType: 'Bike ride',
      pickup: 'District 1',
      destination: 'Binh Thanh',
      riderName: 'Thi Nguyen',
    },
  })

  const onSubmit = (values: TripFormValues) => {
    alert(`New ${values.tripType} created for ${values.riderName}.`)
  }

  const tripQueue = Array.isArray(tripsQuery.data) && tripsQuery.data.length > 0
    ? tripsQuery.data.slice(0, 5).map((trip) => ({
        id: trip.tripCode || `#FG-${trip.tripId}`,
        rider: `Customer ${trip.customerId ?? 'N/A'}`,
        pickup: 'Operational route',
        dropoff: 'Destination route',
        fare: `$${Number(trip.finalFare ?? trip.estimatedFare ?? 0).toFixed(2)}`,
        status: String(trip.status ?? 'REQUESTED'),
      }))
    : tripRows

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Trip orchestration</p>
            <h2 className="text-xl font-semibold text-slate-900">Dispatch booking</h2>
          </div>
          <div className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">Auto-assignment enabled</div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span>Service type</span>
              <select {...register('tripType')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none ring-0 focus:border-emerald-500">
                <option>Bike ride</option>
                <option>Car ride</option>
                <option>Bike delivery</option>
                <option>Car delivery</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Requestor</span>
              <input {...register('riderName')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-emerald-500" />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span>Pickup</span>
              <input {...register('pickup')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-emerald-500" />
              {errors.pickup && <span className="text-xs text-rose-600">{errors.pickup.message}</span>}
            </label>
            <label className="space-y-2 text-sm text-slate-600">
              <span>Destination</span>
              <input {...register('destination')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-emerald-500" />
              {errors.destination && <span className="text-xs text-rose-600">{errors.destination.message}</span>}
            </label>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Estimated route</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">7.4 km • 19 min</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">Estimated fare</div>
                <div className="mt-1 text-lg font-bold text-emerald-700">$18.90</div>
              </div>
            </div>
          </div>

          <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-500">
            <Plus size={16} />
            Create trip offer
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Recent dispatch</p>
        <h2 className="text-xl font-semibold text-slate-900">Trip queue</h2>
        <div className="mt-5 space-y-3">
        {tripQueue.map((trip) => (
            <div key={trip.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">{trip.id}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[trip.status] ?? 'bg-slate-100 text-slate-700'}`}>{trip.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{trip.pickup} → {trip.dropoff}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{trip.rider}</span>
                <span>{trip.fare}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FinancePage() {
  const walletsQuery = useQuery({
    queryKey: ['wallets'],
    queryFn: () => getApiData<WalletApi[]>('/api/v1/drivers/wallet'),
    retry: false,
    staleTime: 60_000,
  })

  const walletData = Array.isArray(walletsQuery.data) && walletsQuery.data.length > 0
    ? walletsQuery.data
    : []

  const walletSummary = [
    { name: 'Gross', value: `$${walletData.reduce((sum, wallet) => sum + Number(wallet.derivedBalance ?? 0), 0).toLocaleString()}` },
    { name: 'Payouts', value: '$49,260' },
    { name: 'Fees', value: '$3,140' },
    { name: 'Net', value: '$16,500' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {walletSummary.map((item) => (
          <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{item.name}</div>
            <div className="mt-4 text-3xl font-bold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Cashflow</p>
          <h2 className="text-xl font-semibold text-slate-900">Payout velocity</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardRevenue}>
                <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Bar dataKey="value" fill="#00AA6C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Top payouts</p>
          <h2 className="text-xl font-semibold text-slate-900">Driver settlements</h2>
          <div className="mt-5 space-y-3">
            {walletData.length > 0 ? walletData.map((wallet) => (
              <div key={wallet.walletId} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="font-medium text-slate-800">Driver {wallet.driverId}</div>
                  <div className="text-xs text-slate-500">{wallet.status ?? 'ACTIVE'} • {wallet.currency ?? 'USD'}</div>
                </div>
                <span className="text-sm font-semibold text-slate-900">${Number(wallet.derivedBalance ?? 0).toFixed(2)}</span>
              </div>
            )) : [
              { name: 'Anh Tran', amount: '$1,420' },
              { name: 'Minh Le', amount: '$1,280' },
              { name: 'Khanh Ho', amount: '$980' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-500">Settlement batch 04</div>
                </div>
                <span className="text-sm font-semibold text-slate-900">{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SupportPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Customer care</p>
          <h2 className="text-xl font-semibold text-slate-900">Support queue</h2>
        </div>
        <button type="button" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <MessageSquareText size={15} />
          New ticket
        </button>
      </div>
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
        No dedicated support endpoint was found in the backend contract, so the queue remains UI-managed until a concrete support API is added.
      </div>
      <div className="space-y-3">
        {supportTickets.map((ticket) => (
          <div key={ticket.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800">{ticket.id}</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPalette[ticket.status] ?? 'bg-slate-100 text-slate-700'}`}>{ticket.status}</span>
              </div>
              <div className="mt-2 text-sm text-slate-600">{ticket.customer}</div>
              <p className="mt-1 text-sm text-slate-700">{ticket.issue}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock3 size={14} />
              {ticket.updated}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditPage() {
  const auditQuery = useQuery({
    queryKey: ['audit'],
    queryFn: () => getApiData<AuditApi[]>('/api/v1/drivers/audit'),
    retry: false,
    staleTime: 60_000,
  })

  const auditEntries = Array.isArray(auditQuery.data) && auditQuery.data.length > 0
    ? auditQuery.data.slice(0, 5).map((entry) => ({
        time: entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00',
        action: entry.action ?? entry.eventType ?? 'Platform event registered',
        actor: entry.actor ?? 'System',
      }))
    : auditTrail

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">Governance</p>
      <h2 className="text-xl font-semibold text-slate-900">Audit trail</h2>
      <div className="mt-5 space-y-4">
        {auditEntries.map((entry, idx) => (
          <div key={`${entry.time}-${idx}`} className="flex gap-4 rounded-xl border border-slate-200 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">{entry.time.split(':')[0]}</div>
            <div>
              <div className="font-medium text-slate-800">{entry.action}</div>
              <div className="mt-1 text-sm text-slate-500">{entry.actor}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Permissions</p>
        <h2 className="text-xl font-semibold text-slate-900">Role access</h2>
        <div className="mt-5 space-y-3">
          {ROLES.map((role) => (
            <div key={role} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${roleColors[role]}`} />
                <span className="font-medium text-slate-700">{role}</span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Authorized</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Platform config</p>
        <h2 className="text-xl font-semibold text-slate-900">Operational controls</h2>
        <div className="mt-5 space-y-4">
          {[
            'Enable dynamic pricing',
            'Require driver document recheck',
            'Auto-dispatch high-priority trips',
            'Offline cash payment verification',
          ].map((item) => (
            <label key={item} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">{item}</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      role: 'ADMIN',
    },
  })

  const onSubmit = async (values: LoginInput) => {
    try {
      await login(values)
    } catch (error) {
      setError('root', {
        message: error instanceof Error ? error.message : 'Unable to authenticate against the FakeGrab gateway.',
      })
    }
  }

  const destination = useMemo(() => (isAuthenticated ? '/' : '/login'), [isAuthenticated])

  if (isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#0d3a2d,_#102A22_40%,_#091911_100%)] p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-emerald-500/25 bg-white shadow-2xl shadow-emerald-950/40 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-[#102A22] p-8 text-white lg:p-10">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">FakeGrab</div>
          <h1 className="mt-6 text-4xl font-bold leading-tight">Secure operations portal</h1>
          <p className="mt-4 max-w-md text-sm text-emerald-50/80">Manage drivers, trips, deliveries, support escalations, and platform payments from a single control surface.</p>

          <div className="mt-8 space-y-4">
            {[
              { icon: Bike, label: 'Bike and car requests' },
              { icon: CarFront, label: 'Live GPS coordination' },
              { icon: Wallet, label: 'Wallet and payout monitoring' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-200"><Icon size={18} /></div>
                <span className="text-sm font-medium text-emerald-50">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            Gateway: {gatewayBaseUrl}
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Sign in</h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <label className="block space-y-2 text-sm text-slate-600">
              <span>Username</span>
              <input {...register('username')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500" placeholder="admin" />
              {errors.username && <span className="text-xs text-rose-600">{errors.username.message}</span>}
            </label>

            <label className="block space-y-2 text-sm text-slate-600">
              <span>Password</span>
              <input type="password" {...register('password')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500" placeholder="Enter your password" />
              {errors.password && <span className="text-xs text-rose-600">{errors.password.message}</span>}
            </label>

            <label className="block space-y-2 text-sm text-slate-600">
              <span>Role</span>
              <select {...register('role')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500">
                {ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>

            {errors.root && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errors.root.message}</div>}

            <div className="flex items-center justify-between text-sm text-slate-600">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                Remember me
              </label>
              <button type="button" className="font-medium text-emerald-700">Need help?</button>
            </div>

            <button type="submit" className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500">
              Sign in to dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
