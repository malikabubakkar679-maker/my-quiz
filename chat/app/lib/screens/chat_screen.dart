import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models.dart';
import '../services/api.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/avatar.dart';
import 'format.dart';
import 'home_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.conversation});
  final Conversation conversation;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final List<Message> _messages = [];
  late DateTime _otherReadAt = widget.conversation.otherReadAt;
  StreamSubscription<Message>? _messageSub;
  StreamSubscription<(String, String, DateTime)>? _readSub;
  Timer? _typingTimer;
  bool _typing = false;
  bool _loading = true;
  bool _sending = false;
  bool _hasMore = false;
  bool _loadingMore = false;
  late final AppState _state = context.read<AppState>();

  String get _id => widget.conversation.id;

  @override
  void initState() {
    super.initState();
    _load();
    _messageSub = _state.messageStream.where((m) => m.conversationId == _id).listen((m) {
      if (_messages.any((x) => x.id == m.id)) return;
      setState(() => _messages.add(m));
      if (m.senderId != _state.me?.id) _state.markConversationRead(_id);
    });
    _readSub = _state.readStream.where((e) => e.$1 == _id && e.$2 != _state.me?.id).listen((e) {
      setState(() => _otherReadAt = e.$3);
    });
    _input.addListener(_onInput);
    _scroll.addListener(_onScroll);
  }

  void _mergeMessages(Iterable<Message> incoming) {
    final known = {for (final m in _messages) m.id};
    _messages
      ..addAll(incoming.where((m) => !known.contains(m.id)))
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  void _onScroll() {
    if (!_scroll.hasClients || !_hasMore || _loadingMore || _messages.isEmpty) return;
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 200) _loadOlder();
  }

  Future<void> _loadOlder() async {
    setState(() => _loadingMore = true);
    try {
      final page = await _state.api.messages(_id, before: _messages.first.createdAt);
      if (!mounted) return;
      setState(() {
        _mergeMessages(page.messages);
        _hasMore = page.hasMore;
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _load() async {
    try {
      final page = await _state.api.messages(_id);
      if (!mounted) return;
      setState(() {
        _mergeMessages(page.messages);
        _hasMore = page.hasMore;
        if (page.conversation.otherReadAt.isAfter(_otherReadAt)) {
          _otherReadAt = page.conversation.otherReadAt;
        }
      });
      _state.markConversationRead(_id);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onInput() {
    final hasText = _input.text.trim().isNotEmpty;
    if (hasText && !_typing) {
      _typing = true;
      _state.sendTyping(_id, true);
    }
    _typingTimer?.cancel();
    _typingTimer = Timer(const Duration(seconds: 2), _stopTyping);
    setState(() {});
  }

  void _stopTyping() {
    if (!_typing) return;
    _typing = false;
    _state.sendTyping(_id, false);
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _input.clear();
    _stopTyping();
    try {
      final message = await _state.api.sendMessage(_id, text);
      if (mounted && !_messages.any((m) => m.id == message.id)) {
        setState(() => _messages.add(message));
      }
    } catch (e) {
      if (!mounted) return;
      _input.text = text;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e is ApiException ? e.message : 'Message not sent')),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showProfile(AppUser user, bool online, DateTime? lastSeen) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.background,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
        child: ProfileHeader(user: user, online: online, lastSeen: lastSeen),
      ),
    );
  }

  @override
  void dispose() {
    _stopTyping();
    _typingTimer?.cancel();
    _scroll.removeListener(_onScroll);
    _messageSub?.cancel();
    _readSub?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final user = state.conversations.where((c) => c.id == _id).firstOrNull?.user ?? widget.conversation.user;
    final online = state.isOnline(user);
    final lastSeen = state.lastSeen(user);
    final typing = state.isTyping(_id);
    final meId = state.me?.id;
    final reversed = _messages.reversed.toList();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: InkWell(
          onTap: () => _showProfile(user, online, lastSeen),
          child: Row(
            children: [
              UserAvatar(
                name: user.displayName,
                url: user.avatarUrl,
                size: 40,
                showStatus: true,
                online: online,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.displayName,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      typing ? 'typing…' : lastSeenLabel(online, lastSeen),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w400,
                        color: typing || online ? AppColors.online : AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline_rounded),
            onPressed: () => _showProfile(user, online, lastSeen),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _messages.isEmpty
                    ? _ChatIntro(user: user)
                    : ListView.builder(
                        controller: _scroll,
                        reverse: true,
                        padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                        itemCount: reversed.length + (_hasMore ? 1 : 0),
                        itemBuilder: (context, i) {
                          if (i == reversed.length) {
                            return const Padding(
                              padding: EdgeInsets.all(16),
                              child: Center(
                                child: SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                                ),
                              ),
                            );
                          }
                          final m = reversed[i];
                          final older = i + 1 < reversed.length ? reversed[i + 1] : null;
                          final newer = i > 0 ? reversed[i - 1] : null;
                          final showDay = older == null || !_sameDay(older.createdAt, m.createdAt);
                          final mine = m.senderId == meId;
                          final groupedWithNewer = newer != null && newer.senderId == m.senderId;
                          return Column(
                            children: [
                              if (showDay) _DayChip(label: dayLabel(m.createdAt)),
                              _Bubble(
                                message: m,
                                mine: mine,
                                read: mine && !_otherReadAt.isBefore(m.createdAt),
                                tail: !groupedWithNewer,
                              ),
                            ],
                          );
                        },
                      ),
          ),
          _Composer(
            controller: _input,
            sending: _sending,
            onSend: _send,
          ),
        ],
      ),
    );
  }
}

bool _sameDay(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

class _ChatIntro extends StatelessWidget {
  const _ChatIntro({required this.user});
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            UserAvatar(name: user.displayName, url: user.avatarUrl, size: 88),
            const SizedBox(height: 16),
            Text(user.displayName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            Text('@${user.username}', style: const TextStyle(color: AppColors.primary)),
            if (user.bio.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(user.bio, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
            ],
            const SizedBox(height: 20),
            const Text('Say hi and start the conversation 👋', style: TextStyle(color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

class _DayChip extends StatelessWidget {
  const _DayChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.mine, required this.read, required this.tail});
  final Message message;
  final bool mine;
  final bool read;
  final bool tail;

  @override
  Widget build(BuildContext context) {
    const r = Radius.circular(20);
    const small = Radius.circular(6);
    final radius = BorderRadius.only(
      topLeft: r,
      topRight: r,
      bottomLeft: mine || !tail ? r : small,
      bottomRight: mine && tail ? small : r,
    );
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.75),
        child: Container(
          margin: EdgeInsets.only(top: 2, bottom: tail ? 8 : 2),
          padding: const EdgeInsets.fromLTRB(14, 10, 12, 8),
          decoration: BoxDecoration(
            gradient: mine ? AppColors.gradient : null,
            color: mine ? null : AppColors.surfaceHigh,
            borderRadius: radius,
          ),
          child: Wrap(
            alignment: WrapAlignment.end,
            crossAxisAlignment: WrapCrossAlignment.end,
            spacing: 8,
            children: [
              Text(message.text, style: const TextStyle(fontSize: 15.5, height: 1.35, color: Colors.white)),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    DateFormat.jm().format(message.createdAt),
                    style: TextStyle(fontSize: 11, color: Colors.white.withValues(alpha: 0.7)),
                  ),
                  if (mine) ...[
                    const SizedBox(width: 4),
                    Icon(
                      read ? Icons.done_all_rounded : Icons.done_rounded,
                      size: 15,
                      color: read ? Colors.white : Colors.white.withValues(alpha: 0.7),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({required this.controller, required this.sending, required this.onSend});
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) {
    final canSend = controller.text.trim().isNotEmpty && !sending;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        decoration: const BoxDecoration(
          color: AppColors.background,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 5,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => onSend(),
                decoration: InputDecoration(
                  hintText: 'Message',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(28),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(28),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(28),
                    borderSide: const BorderSide(color: AppColors.primary),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            AnimatedScale(
              duration: const Duration(milliseconds: 150),
              scale: canSend ? 1 : 0.9,
              child: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: canSend ? AppColors.gradient : null,
                  color: canSend ? null : AppColors.surfaceHigh,
                ),
                child: IconButton(
                  icon: const Icon(Icons.send_rounded, color: Colors.white),
                  onPressed: canSend ? onSend : null,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
