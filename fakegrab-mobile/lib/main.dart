import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

const String fakeGrabGatewayBaseUrl = 'http://localhost:8081';
const String fakeGrabWebSocketBaseUrl = 'ws://localhost:8092';

const Color fakeGrabGreen = Color(0xFF008F5A);
const Color fakeGrabMain = Color(0xFF00AA6C);
const Color fakeGrabLight = Color(0xFFE8F7EF);
const Color fakeGrabDark = Color(0xFF102A22);

final _secureStorage = const FlutterSecureStorage();
final _dio = Dio(
  BaseOptions(
    baseUrl: fakeGrabGatewayBaseUrl,
    connectTimeout: Duration(seconds: 10),
    receiveTimeout: Duration(seconds: 10),
  ),
);

class FakeGrabApi {
  Future<Map<String, dynamic>> login({
    required String username,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/api/v1/auth/login',
        data: {
          'username': username,
          'password': password,
        },
      );

      final payload = response.data is Map<String, dynamic>
          ? response.data['data'] ?? response.data
          : response.data;

      if (payload == null || payload['accessToken'] == null) {
        throw const FormatException('Gateway did not return an access token');
      }

      await _secureStorage.write(
        key: 'fakegrab_access_token',
        value: payload['accessToken'],
      );
      await _secureStorage.write(
        key: 'fakegrab_refresh_token',
        value: payload['refreshToken'] ?? '',
      );

      return payload;
    } on DioException catch (error) {
      throw Exception('Login failed: ${error.response?.data ?? error.message}');
    }
  }
}

class AppSession {
  const AppSession({
    required this.isAuthenticated,
    required this.role,
    required this.name,
  });

  final bool isAuthenticated;
  final String role;
  final String name;

  AppSession copyWith({bool? isAuthenticated, String? role, String? name}) {
    return AppSession(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      role: role ?? this.role,
      name: name ?? this.name,
    );
  }
}

class SessionController extends StateNotifier<AppSession> {
  SessionController()
      : super(const AppSession(
          isAuthenticated: false,
          role: '',
          name: '',
        ));

  Future<void> login(String username, String role, String password) async {
    final payload = await FakeGrabApi().login(
      username: username,
      password: password,
    );

    if (payload['accessToken'] == null) {
      throw Exception('Authentication token is missing');
    }

    state = AppSession(
      isAuthenticated: true,
      role: role,
      name: username,
    );
  }

  Future<void> logout() async {
    await _secureStorage.delete(key: 'fakegrab_access_token');
    await _secureStorage.delete(key: 'fakegrab_refresh_token');
    state = const AppSession(isAuthenticated: false, role: '', name: '');
  }
}

final sessionProvider = StateNotifierProvider<SessionController, AppSession>((ref) {
  return SessionController();
});

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(sessionProvider);
  return GoRouter(
    initialLocation: auth.isAuthenticated ? '/home' : '/login',
    redirect: (context, state) {
      final loggedIn = ref.read(sessionProvider).isAuthenticated;
      final onLogin = state.matchedLocation == '/login';
      if (!loggedIn && !onLogin) return '/login';
      if (loggedIn && onLogin) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/home', builder: (context, state) => const HomePage()),
          GoRoute(path: '/trips', builder: (context, state) => const TripsPage()),
          GoRoute(path: '/wallet', builder: (context, state) => const WalletPage()),
          GoRoute(path: '/support', builder: (context, state) => const SupportPage()),
        ],
      ),
    ],
  );
});

class FakeGrabApp extends ConsumerWidget {
  const FakeGrabApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      routeInformationProvider: router.routeInformationProvider,
      routeInformationParser: router.routeInformationParser,
      routerDelegate: router.routerDelegate,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFFF4FAF7),
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: fakeGrabMain),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: fakeGrabDark,
          elevation: 0,
        ),
      ),
      title: 'FakeGrab',
    );
  }
}

void main() {
  runApp(const ProviderScope(child: FakeGrabApp()));
}

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  String selectedRole = 'ADMIN';

  @override
  void dispose() {
    usernameController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: fakeGrabDark,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 440),
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 20)],
              ),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'FakeGrab',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 4,
                        color: fakeGrabGreen,
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Secure access',
                      style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: fakeGrabDark),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Select a role and continue to the operations dashboard.',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: usernameController,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty || value.trim().length < 3) {
                          return 'Use a valid username';
                        }
                        return null;
                      },
                      decoration: const InputDecoration(
                        labelText: 'Username',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: passwordController,
                      obscureText: true,
                      validator: (value) {
                        if (value == null || value.length < 8) {
                          return 'Password must be at least 8 characters';
                        }
                        return null;
                      },
                      decoration: const InputDecoration(
                        labelText: 'Password',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: selectedRole,
                      decoration: const InputDecoration(
                        labelText: 'Role',
                        border: OutlineInputBorder(),
                      ),
                      items: const ['ADMIN', 'DRIVER', 'CUSTOMER', 'SUPPORT', 'FINANCE', 'REVIEWER']
                          .map((role) => DropdownMenuItem(value: role, child: Text(role)))
                          .toList(),
                      onChanged: (value) => setState(() => selectedRole = value ?? selectedRole),
                    ),
                    const SizedBox(height: 22),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () async {
                          if (_formKey.currentState!.validate()) {
                            try {
                              await ref.read(sessionProvider.notifier).login(
                                usernameController.text.trim(),
                                selectedRole,
                                passwordController.text.trim(),
                              );
                              if (context.mounted) {
                                context.go('/home');
                              }
                            } catch (error) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(error.toString())),
                                );
                              }
                            }
                          }
                        },
                        icon: const Icon(Icons.login_rounded),
                        label: const Text('Sign in'),
                        style: FilledButton.styleFrom(
                          backgroundColor: fakeGrabMain,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class MainShell extends ConsumerWidget {
  const MainShell({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentLocation = GoRouterState.of(context).matchedLocation;
    final session = ref.watch(sessionProvider);
    final tabs = session.role == 'DRIVER' || session.role == 'CUSTOMER'
        ? [
            ('/home', Icons.home_rounded, 'Home'),
            ('/trips', Icons.directions_car_rounded, 'Trips'),
            ('/support', Icons.support_agent_rounded, 'Support'),
          ]
        : [
            ('/home', Icons.home_rounded, 'Home'),
            ('/trips', Icons.directions_car_rounded, 'Trips'),
            ('/wallet', Icons.account_balance_wallet_rounded, 'Wallet'),
            ('/support', Icons.support_agent_rounded, 'Support'),
          ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('FakeGrab'),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.notifications_none_rounded)),
          IconButton(
            onPressed: () {
              ref.read(sessionProvider.notifier).logout();
              context.go('/login');
            },
            icon: const Icon(Icons.logout_rounded),
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: tabs.indexWhere((entry) => entry.$1 == currentLocation),
        onDestinationSelected: (idx) => context.go(tabs[idx].$1),
        destinations: tabs
            .map((entry) => NavigationDestination(icon: Icon(entry.$2), label: entry.$3))
            .toList(),
      ),
    );
  }
}

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final role = session.role;

    final heroTitle = switch (role) {
      'DRIVER' => 'Driver status overview',
      'CUSTOMER' => 'Ride summary',
      'SUPPORT' => 'Support queue alert',
      'FINANCE' => 'Settlement overview',
      'REVIEWER' => 'Review queue',
      _ => 'Development mock mode',
    };

    final heroBody = switch (role) {
      'DRIVER' => 'Your vehicle and trip readiness are healthy for the next dispatch cycle.',
      'CUSTOMER' => 'Your trip history and support requests are up to date.',
      'SUPPORT' => 'Customer escalations are being triaged within the target SLA.',
      'FINANCE' => 'Wallet processing and settlements are tracked for this payout cycle.',
      'REVIEWER' => 'Compliance checks and document reviews are queued for approval.',
      _ => 'Your platform is healthy, with 1842 trips processed today.',
    };

    final metrics = switch (role) {
      'DRIVER' => const [
          _MetricCard(label: 'Trips today', value: '18', delta: '+3.2%'),
          _MetricCard(label: 'Earnings', value: '\$820', delta: '+\$120'),
        ],
      'CUSTOMER' => const [
          _MetricCard(label: 'Trips booked', value: '24', delta: '+6.7%'),
          _MetricCard(label: 'Avg. spend', value: '\$58', delta: '+\$8'),
        ],
      'SUPPORT' => const [
          _MetricCard(label: 'Open tickets', value: '18', delta: '8 urgent'),
          _MetricCard(label: 'SLA hit', value: '98.2%', delta: 'Target'),
        ],
      'FINANCE' => const [
          _MetricCard(label: 'Gross', value: '\$68.9k', delta: '+12.1%'),
          _MetricCard(label: 'Net', value: '\$16.5k', delta: '+8.4%'),
        ],
      'REVIEWER' => const [
          _MetricCard(label: 'Pending', value: '12', delta: '7 high risk'),
          _MetricCard(label: 'Approval', value: '59', delta: '+12.4%'),
        ],
      _ => const [
          _MetricCard(label: 'Trips today', value: '1,842', delta: '+12.8%'),
          _MetricCard(label: 'Active drivers', value: '314', delta: '+9.1%'),
        ],
    };

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: const LinearGradient(
              colors: [fakeGrabMain, fakeGrabGreen],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.developer_mode_rounded, color: Colors.white),
                  SizedBox(width: 8),
                  Text(
                    'Role-aware dashboard',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Welcome back, ${session.name}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                heroTitle,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
              const SizedBox(height: 6),
              Text(
                heroBody,
                style: const TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            for (var i = 0; i < metrics.length; i++) ...[
              Expanded(child: metrics[i]),
              if (i < metrics.length - 1) const SizedBox(width: 12),
            ],
          ],
        ),
        const SizedBox(height: 18),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Live trip board', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 16),
                ...const [
                  {'title': 'FG-1024', 'body': 'District 1 → Phu Nhuan', 'meta': 'Bike ride • \$18.50'},
                  {'title': 'FG-1039', 'body': 'Thu Duc → District 7', 'meta': 'Car delivery • \$24.20'},
                  {'title': 'FG-1045', 'body': 'Go Vap → Binh Chanh', 'meta': 'Car ride • \$32.00'},
                ].map((entry) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry['title']!),
                  subtitle: Text(entry['body']!),
                  trailing: Text(
                    entry['meta']!,
                    style: const TextStyle(fontWeight: FontWeight.w600, color: fakeGrabGreen),
                  ),
                )),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class TripsPage extends StatefulWidget {
  const TripsPage({super.key});

  @override
  State<TripsPage> createState() => _TripsPageState();
}

class _TripsPageState extends State<TripsPage> {
  final _formKey = GlobalKey<FormState>();
  String serviceType = 'Bike ride';
  final pickup = TextEditingController(text: 'District 1');
  final destination = TextEditingController(text: 'Binh Thanh');
  final rider = TextEditingController(text: 'Thi Nguyen');

  @override
  void dispose() {
    pickup.dispose();
    destination.dispose();
    rider.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Dispatch booking',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 18),
                    DropdownButtonFormField<String>(
                      value: serviceType,
                      items: const ['Bike ride', 'Car ride', 'Bike delivery', 'Car delivery']
                          .map((value) => DropdownMenuItem(value: value, child: Text(value)))
                          .toList(),
                      onChanged: (value) => setState(() => serviceType = value ?? serviceType),
                      decoration: const InputDecoration(
                        labelText: 'Service type',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: pickup,
                      validator: (value) => value == null || value.isEmpty ? 'Pickup required' : null,
                      decoration: const InputDecoration(
                        labelText: 'Pickup',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: destination,
                      validator: (value) => value == null || value.isEmpty ? 'Destination required' : null,
                      decoration: const InputDecoration(
                        labelText: 'Destination',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: rider,
                      validator: (value) => value == null || value.isEmpty ? 'Name required' : null,
                      decoration: const InputDecoration(
                        labelText: 'Customer / rider name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () {
                          if (_formKey.currentState!.validate()) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('$serviceType created for ${rider.text}')),
                            );
                          }
                        },
                        style: FilledButton.styleFrom(
                          backgroundColor: fakeGrabMain,
                          minimumSize: const Size.fromHeight(48),
                        ),
                        child: const Text('Create trip offer'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text('Route preview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  SizedBox(height: 8),
                  Text('7.4 km • 19 min', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
                  SizedBox(height: 8),
                  Text(
                    'Estimated fare: \$18.90',
                    style: TextStyle(color: fakeGrabGreen, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class WalletPage extends StatelessWidget {
  const WalletPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          color: fakeGrabDark,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Wallet balance',
                  style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 10),
                const Text(
                  '\$ 12,480.50',
                  style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 18),
                Row(
                  children: const [
                    _MiniWalletStat(title: 'Gross', value: '\$ 68.9k'),
                    Spacer(),
                    _MiniWalletStat(title: 'Payouts', value: '\$ 49.2k'),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Recent activity', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                ...[
                  {'label': 'Trip settlement', 'value': '+\$340.00'},
                  {'label': 'Cash payment', 'value': '+\$42.00'},
                  {'label': 'Withdrawal', 'value': '-\$180.00'},
                ].map((entry) => ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry['label']!),
                  trailing: Text(
                    entry['value']!,
                    style: const TextStyle(fontWeight: FontWeight.w700, color: fakeGrabGreen),
                  ),
                )),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class SupportPage extends StatelessWidget {
  const SupportPage({super.key});

  @override
  Widget build(BuildContext context) {
    final tickets = [
      {'id': 'SUP-247', 'issue': 'Driver late beyond ETA', 'status': 'Priority'},
      {'id': 'SUP-251', 'issue': 'Refund request for duplicate payment', 'status': 'Review'},
      {'id': 'SUP-269', 'issue': 'Vehicle document verification', 'status': 'Resolved'},
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: tickets.map((ticket) {
        final status = ticket['status']!;
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: ListTile(
            title: Text(ticket['id']!, style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(ticket['issue']!),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: status == 'Priority'
                    ? Colors.red.shade100
                    : status == 'Review'
                        ? Colors.orange.shade100
                        : Colors.green.shade100,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                status,
                style: TextStyle(
                  color: status == 'Priority'
                      ? Colors.red.shade700
                      : status == 'Review'
                          ? Colors.orange.shade700
                          : Colors.green.shade700,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value, required this.delta});

  final String label;
  final String value;
  final String delta;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          const SizedBox(height: 10),
          Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: fakeGrabDark)),
          const SizedBox(height: 8),
          Text(delta, style: const TextStyle(color: fakeGrabGreen, fontWeight: FontWeight.w700, fontSize: 12)),
        ],
      ),
    );
  }
}

class _MiniWalletStat extends StatelessWidget {
  const _MiniWalletStat({required this.title, required this.value});

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(color: Colors.white70, fontSize: 11)),
        const SizedBox(height: 5),
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      ],
    );
  }
}