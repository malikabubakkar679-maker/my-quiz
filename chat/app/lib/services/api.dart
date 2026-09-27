import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config.dart';
import '../models.dart';

class ApiException implements Exception {
  ApiException(this.message, [this.status]);
  final String message;
  final int? status;
  @override
  String toString() => message;
}

class AuthResult {
  AuthResult(this.token, this.user);
  final String token;
  final AppUser user;
}

class ApiClient {
  ApiClient({this.token});

  String? token;

  Uri _uri(String path, [Map<String, String>? query]) =>
      Uri.parse('${AppConfig.apiUrl}/api$path').replace(queryParameters: query);

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Object? body,
    Map<String, String>? query,
  }) async {
    final request = http.Request(method, _uri(path, query))..headers.addAll(_headers);
    if (body != null) request.body = jsonEncode(body);
    http.Response response;
    try {
      response = await http.Response.fromStream(await request.send());
    } catch (_) {
      throw ApiException('Unable to reach the server. Check your connection.');
    }
    final data = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode >= 400) {
      throw ApiException((data['error'] as String?) ?? 'Request failed', response.statusCode);
    }
    return data;
  }

  AuthResult _auth(Map<String, dynamic> data) =>
      AuthResult(data['token'] as String, AppUser.fromJson(data['user'] as Map<String, dynamic>));

  Future<bool> usernameAvailable(String username) async {
    final data = await _send('GET', '/auth/username-available', query: {'username': username});
    return data['available'] as bool;
  }

  Future<AuthResult> register({
    required String username,
    required String password,
    required String displayName,
    required String bio,
    String? avatarDataUrl,
  }) async =>
      _auth(await _send('POST', '/auth/register', body: {
        'username': username,
        'password': password,
        'displayName': displayName,
        'bio': bio,
        'avatar': avatarDataUrl,
      }));

  Future<AuthResult> login(String username, String password) async =>
      _auth(await _send('POST', '/auth/login', body: {'username': username, 'password': password}));

  Future<void> logout() => _send('POST', '/auth/logout');

  Future<AppUser> me() async =>
      AppUser.fromJson((await _send('GET', '/me'))['user'] as Map<String, dynamic>);

  Future<AppUser> updateProfile({String? displayName, String? bio, String? avatarDataUrl}) async {
    final data = await _send('PUT', '/me', body: {
      'displayName': ?displayName,
      'bio': ?bio,
      'avatar': ?avatarDataUrl,
    });
    return AppUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  Future<List<AppUser>> users([String query = '']) async {
    final data = await _send('GET', '/users', query: {'q': query});
    return (data['users'] as List).map((u) => AppUser.fromJson(u as Map<String, dynamic>)).toList();
  }

  Future<AppUser> user(String id) async =>
      AppUser.fromJson((await _send('GET', '/users/$id'))['user'] as Map<String, dynamic>);

  Future<List<Conversation>> conversations() async {
    final data = await _send('GET', '/conversations');
    return (data['conversations'] as List)
        .map((c) => Conversation.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  Future<Conversation> openConversation(String userId) async => Conversation.fromJson(
      (await _send('POST', '/conversations', body: {'userId': userId}))['conversation']
          as Map<String, dynamic>);

  Future<(List<Message>, Conversation)> messages(String conversationId) async {
    final data = await _send('GET', '/conversations/$conversationId/messages');
    final messages = (data['messages'] as List)
        .map((m) => Message.fromJson(m as Map<String, dynamic>))
        .toList();
    return (messages, Conversation.fromJson(data['conversation'] as Map<String, dynamic>));
  }

  Future<Message> sendMessage(String conversationId, String text) async => Message.fromJson(
      (await _send('POST', '/conversations/$conversationId/messages', body: {'text': text}))['message']
          as Map<String, dynamic>);

  Future<void> markRead(String conversationId) => _send('POST', '/conversations/$conversationId/read');
}
