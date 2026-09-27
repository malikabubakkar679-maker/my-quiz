import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models.dart';
import '../state/app_state.dart';
import '../theme.dart';
import '../widgets/avatar.dart';
import 'auth_screen.dart';
import 'chat_screen.dart';
import 'edit_profile_screen.dart';
import 'format.dart';
import 'routes.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final unread = context.select<AppState, int>((s) => s.unreadTotal);
    return Scaffold(
      body: IndexedStack(
        index: _tab,
        children: [
          const _ChatsTab(),
          _PeopleTab(active: _tab == 1),
          const _ProfileTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.chat_bubble_outline_rounded),
            ),
            selectedIcon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              child: const Icon(Icons.chat_bubble_rounded),
            ),
            label: 'Chats',
          ),
          const NavigationDestination(
            icon: Icon(Icons.people_outline_rounded),
            selectedIcon: Icon(Icons.people_rounded),
            label: 'People',
          ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline_rounded),
            selectedIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

void openChat(BuildContext context, Conversation conversation) {
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => ChatScreen(conversation: conversation)));
}

class _ChatsTab extends StatelessWidget {
  const _ChatsTab();

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    final me = state.me;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chats'),
        actions: [
          if (me != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: UserAvatar(name: me.displayName, url: me.avatarUrl, size: 36),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: state.refreshConversations,
        child: state.conversations.isEmpty
            ? ListView(
                children: const [
                  SizedBox(height: 120),
                  _EmptyState(
                    icon: Icons.forum_outlined,
                    title: 'No conversations yet',
                    body: 'Head to People to find someone and say hello.',
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: state.conversations.length,
                separatorBuilder: (_, _) => const Divider(height: 1, indent: 88),
                itemBuilder: (context, i) {
                  final c = state.conversations[i];
                  final last = c.lastMessage;
                  final typing = state.isTyping(c.id);
                  final mine = last?.senderId == me?.id;
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                    onTap: () => openChat(context, c),
                    leading: UserAvatar(
                      name: c.user.displayName,
                      url: c.user.avatarUrl,
                      size: 54,
                      showStatus: true,
                      online: state.isOnline(c.user),
                    ),
                    title: Text(
                      c.user.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: typing
                          ? const Text('typing…',
                              style: TextStyle(color: AppColors.primary, fontStyle: FontStyle.italic))
                          : Row(
                              children: [
                                if (mine)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 4),
                                    child: Icon(
                                      Icons.done_all_rounded,
                                      size: 16,
                                      color: !c.otherReadAt.isBefore(last!.createdAt)
                                          ? AppColors.secondary
                                          : AppColors.textMuted,
                                    ),
                                  ),
                                Expanded(
                                  child: Text(
                                    last?.text ?? '',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      color: c.unread > 0 ? AppColors.text : AppColors.textMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          shortTime(c.updatedAt),
                          style: TextStyle(
                            fontSize: 12,
                            color: c.unread > 0 ? AppColors.primary : AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(height: 6),
                        if (c.unread > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              gradient: AppColors.gradient,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${c.unread}',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                          )
                        else
                          const SizedBox(height: 18),
                      ],
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class _PeopleTab extends StatefulWidget {
  const _PeopleTab({required this.active});
  final bool active;

  @override
  State<_PeopleTab> createState() => _PeopleTabState();
}

class _PeopleTabState extends State<_PeopleTab> {
  final _search = TextEditingController();
  List<AppUser> _users = [];
  bool _loading = true;
  Timer? _debounce;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant _PeopleTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _load();
  }

  Future<void> _load() async {
    final request = ++_request;
    try {
      final users = await context.read<AppState>().api.users(_search.text.trim());
      if (mounted && request == _request) setState(() => _users = users);
    } catch (_) {
    } finally {
      if (mounted && request == _request) setState(() => _loading = false);
    }
  }

  Future<void> _open(AppUser user) async {
    try {
      final conv = await context.read<AppState>().api.openConversation(user.id);
      if (mounted) openChat(context, conv);
    } catch (_) {}
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<AppState>();
    return Scaffold(
      appBar: AppBar(title: const Text('People')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
            child: TextField(
              controller: _search,
              onChanged: (_) {
                _debounce?.cancel();
                _debounce = Timer(const Duration(milliseconds: 300), _load);
              },
              decoration: const InputDecoration(
                hintText: 'Search by username or name',
                prefixIcon: Icon(Icons.search_rounded),
              ),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _users.isEmpty
                    ? const _EmptyState(
                        icon: Icons.person_search_rounded,
                        title: 'Nobody here yet',
                        body: 'Invite friends to join NightChat and they will show up here.',
                      )
                    : RefreshIndicator(
                        color: AppColors.primary,
                        onRefresh: _load,
                        child: ListView.builder(
                          itemCount: _users.length,
                          itemBuilder: (context, i) {
                            final u = _users[i];
                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                              onTap: () => _open(u),
                              leading: UserAvatar(
                                name: u.displayName,
                                url: u.avatarUrl,
                                size: 50,
                                showStatus: true,
                                online: state.isOnline(u),
                              ),
                              title: Text(u.displayName, style: const TextStyle(fontWeight: FontWeight.w700)),
                              subtitle: Text(
                                u.bio.isEmpty ? '@${u.username}' : '@${u.username} · ${u.bio}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: AppColors.textMuted),
                              ),
                              trailing: IconButton.filledTonal(
                                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 20),
                                onPressed: () => _open(u),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  Future<void> _logout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Log out?'),
        content: const Text('You can log back in anytime with your username.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Log out', style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    await context.read<AppState>().logout();
    if (!context.mounted) return;
    Navigator.of(context).pushAndRemoveUntil(fadeRoute(const AuthScreen()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AppState>().me;
    if (me == null) return const SizedBox.shrink();
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          ProfileHeader(user: me, online: true, lastSeen: me.lastSeen),
          const SizedBox(height: 28),
          _SettingsTile(
            icon: Icons.edit_rounded,
            label: 'Edit profile',
            onTap: () => Navigator.of(context)
                .push(MaterialPageRoute(builder: (_) => const EditProfileScreen())),
          ),
          _SettingsTile(
            icon: Icons.logout_rounded,
            label: 'Log out',
            color: AppColors.danger,
            onTap: () => _logout(context),
          ),
        ],
      ),
    );
  }
}

class ProfileHeader extends StatelessWidget {
  const ProfileHeader({super.key, required this.user, required this.online, required this.lastSeen});
  final AppUser user;
  final bool online;
  final DateTime? lastSeen;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(3),
            decoration: const BoxDecoration(shape: BoxShape.circle, gradient: AppColors.gradient),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.surface),
              child: UserAvatar(name: user.displayName, url: user.avatarUrl, size: 104),
            ),
          ),
          const SizedBox(height: 16),
          Text(user.displayName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text('@${user.username}', style: const TextStyle(color: AppColors.primary, fontSize: 15)),
          const SizedBox(height: 8),
          Text(
            lastSeenLabel(online, lastSeen),
            style: TextStyle(color: online ? AppColors.online : AppColors.textMuted, fontSize: 13),
          ),
          const SizedBox(height: 16),
          Text(
            user.bio.isEmpty ? 'No bio yet' : user.bio,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: user.bio.isEmpty ? AppColors.textMuted : AppColors.text,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({required this.icon, required this.label, required this.onTap, this.color});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        child: ListTile(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          leading: Icon(icon, color: color ?? AppColors.primary),
          title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
          trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          onTap: onTap,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.title, required this.body});
  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 72, color: AppColors.border),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(body, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
