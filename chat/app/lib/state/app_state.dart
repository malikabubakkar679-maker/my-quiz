import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../config.dart';
import '../models.dart';
import '../services/api.dart';

class AppState extends ChangeNotifier {
  static const _tokenKey = 'auth_token';
  static const _onboardingKey = 'onboarding_done';

  final ApiClient api = ApiClient();
  late SharedPreferences _prefs;
  io.Socket? _socket;

  AppUser? me;
  bool onboardingDone = false;
  List<Conversation> conversations = [];
  final Map<String, Set<String>> _typing = {};
  final Map<String, bool> _presence = {};
  final Map<String, DateTime> _lastSeen = {};
  final _messageEvents = StreamController<Message>.broadcast();
  final _readEvents = StreamController<(String, String, DateTime)>.broadcast();

  Stream<Message> get messageStream => _messageEvents.stream;
  Stream<(String conversationId, String userId, DateTime at)> get readStream => _readEvents.stream;
  bool get isLoggedIn => me != null;
  int get unreadTotal => conversations.fold(0, (sum, c) => sum + c.unread);

  bool isTyping(String conversationId) => _typing[conversationId]?.isNotEmpty ?? false;
  bool isOnline(AppUser user) => _presence[user.id] ?? user.online;
  DateTime? lastSeen(AppUser user) => _lastSeen[user.id] ?? user.lastSeen;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    onboardingDone = _prefs.getBool(_onboardingKey) ?? false;
    final token = _prefs.getString(_tokenKey);
    if (token == null) return;
    api.token = token;
    try {
      me = await api.me();
      await _afterLogin();
    } on ApiException catch (e) {
      if (e.status == 401) {
        await _clearSession();
      }
    }
  }

  Future<void> completeOnboarding() async {
    onboardingDone = true;
    await _prefs.setBool(_onboardingKey, true);
    notifyListeners();
  }

  Future<void> login(String username, String password) async {
    await _setSession(await api.login(username, password));
  }

  Future<void> register({
    required String username,
    required String password,
    required String displayName,
    required String bio,
    String? avatarDataUrl,
  }) async {
    await _setSession(await api.register(
      username: username,
      password: password,
      displayName: displayName,
      bio: bio,
      avatarDataUrl: avatarDataUrl,
    ));
  }

  Future<void> updateProfile({String? displayName, String? bio, String? avatarDataUrl}) async {
    me = await api.updateProfile(displayName: displayName, bio: bio, avatarDataUrl: avatarDataUrl);
    notifyListeners();
  }

  Future<void> logout() async {
    try {
      await api.logout();
    } catch (_) {}
    await _clearSession();
    notifyListeners();
  }

  Future<void> refreshConversations() async {
    conversations = await api.conversations();
    notifyListeners();
  }

  Future<void> markConversationRead(String conversationId) async {
    try {
      await api.markRead(conversationId);
    } catch (_) {
      return;
    }
    final conv = conversations.where((c) => c.id == conversationId).firstOrNull;
    if (conv != null && conv.unread > 0) {
      conv.unread = 0;
      notifyListeners();
    }
  }

  void sendTyping(String conversationId, bool typing) {
    _socket?.emit('typing', {'conversationId': conversationId, 'typing': typing});
  }

  Future<void> _setSession(AuthResult result) async {
    api.token = result.token;
    me = result.user;
    await _prefs.setString(_tokenKey, result.token);
    await _afterLogin();
    notifyListeners();
  }

  Future<void> _clearSession() async {
    _socket?.dispose();
    _socket = null;
    api.token = null;
    me = null;
    conversations = [];
    _typing.clear();
    _presence.clear();
    _lastSeen.clear();
    await _prefs.remove(_tokenKey);
  }

  Future<void> _afterLogin() async {
    _connectSocket();
    try {
      await refreshConversations();
    } catch (_) {}
  }

  void _connectSocket() {
    _socket?.dispose();
    final socket = io.io(
      AppConfig.apiUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': api.token})
          .enableForceNew()
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );

    socket.on('message:new', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final message = Message.fromJson(Map<String, dynamic>.from(map['message'] as Map));
      final updated = Conversation.fromJson(_deepMap(map['conversation']));
      conversations.removeWhere((c) => c.id == updated.id);
      conversations.insert(0, updated);
      _typing[updated.id]?.remove(message.senderId);
      _messageEvents.add(message);
      notifyListeners();
    });

    socket.on('conversation:read', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final conversationId = map['conversationId'] as String;
      final userId = map['userId'] as String;
      final at = DateTime.fromMillisecondsSinceEpoch((map['at'] as num).toInt());
      for (final c in conversations) {
        if (c.id == conversationId && userId != me?.id) c.otherReadAt = at;
      }
      _readEvents.add((conversationId, userId, at));
      notifyListeners();
    });

    socket.on('typing', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final set = _typing.putIfAbsent(map['conversationId'] as String, () => <String>{});
      final userId = map['userId'] as String;
      if (map['typing'] == true) {
        set.add(userId);
      } else {
        set.remove(userId);
      }
      notifyListeners();
    });

    socket.on('presence', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      final userId = map['userId'] as String;
      final isOnline = map['online'] == true;
      _presence[userId] = isOnline;
      final lastSeen = map['lastSeen'];
      if (lastSeen is num) {
        _lastSeen[userId] = DateTime.fromMillisecondsSinceEpoch(lastSeen.toInt());
      }
      if (!isOnline) {
        for (final set in _typing.values) {
          set.remove(userId);
        }
      }
      notifyListeners();
    });

    socket.on('user:updated', (data) {
      final user = AppUser.fromJson(_deepMap(data));
      for (final c in conversations) {
        if (c.user.id == user.id) c.user = user;
      }
      notifyListeners();
    });

    socket.connect();
    _socket = socket;
  }

  static Map<String, dynamic> _deepMap(Object? value) =>
      Map<String, dynamic>.from((value as Map).map((k, v) => MapEntry(k as String, v is Map ? _deepMap(v) : v)));

  @override
  void dispose() {
    _socket?.dispose();
    _messageEvents.close();
    _readEvents.close();
    super.dispose();
  }
}
