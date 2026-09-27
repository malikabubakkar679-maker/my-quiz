class AppUser {
  AppUser({
    required this.id,
    required this.username,
    required this.displayName,
    required this.bio,
    required this.avatarUrl,
    required this.online,
    required this.lastSeen,
    required this.createdAt,
  });

  final String id;
  final String username;
  final String displayName;
  final String bio;
  final String? avatarUrl;
  final bool online;
  final DateTime? lastSeen;
  final DateTime createdAt;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        username: json['username'] as String,
        displayName: (json['displayName'] as String?) ?? json['username'] as String,
        bio: (json['bio'] as String?) ?? '',
        avatarUrl: json['avatarUrl'] as String?,
        online: (json['online'] as bool?) ?? false,
        lastSeen: _date(json['lastSeen']),
        createdAt: _date(json['createdAt']) ?? DateTime.now(),
      );

  AppUser copyWith({bool? online, DateTime? lastSeen}) => AppUser(
        id: id,
        username: username,
        displayName: displayName,
        bio: bio,
        avatarUrl: avatarUrl,
        online: online ?? this.online,
        lastSeen: lastSeen ?? this.lastSeen,
        createdAt: createdAt,
      );
}

class Message {
  Message({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.text,
    required this.createdAt,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final String text;
  final DateTime createdAt;

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'] as String,
        conversationId: json['conversationId'] as String,
        senderId: json['senderId'] as String,
        text: json['text'] as String,
        createdAt: _date(json['createdAt'])!,
      );
}

class Conversation {
  Conversation({
    required this.id,
    required this.user,
    required this.lastMessage,
    required this.unread,
    required this.otherReadAt,
    required this.updatedAt,
  });

  final String id;
  AppUser user;
  Message? lastMessage;
  int unread;
  DateTime otherReadAt;
  DateTime updatedAt;

  factory Conversation.fromJson(Map<String, dynamic> json) => Conversation(
        id: json['id'] as String,
        user: AppUser.fromJson(json['user'] as Map<String, dynamic>),
        lastMessage: json['lastMessage'] == null
            ? null
            : Message.fromJson(json['lastMessage'] as Map<String, dynamic>),
        unread: (json['unread'] as num?)?.toInt() ?? 0,
        otherReadAt: _date(json['otherReadAt']) ?? DateTime.fromMillisecondsSinceEpoch(0),
        updatedAt: _date(json['updatedAt']) ?? DateTime.now(),
      );
}

DateTime? _date(Object? value) =>
    value is num && value > 0 ? DateTime.fromMillisecondsSinceEpoch(value.toInt()) : null;
