import 'package:intl/intl.dart';

String shortTime(DateTime time) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(time.year, time.month, time.day);
  if (day == today) return DateFormat.jm().format(time);
  if (today.difference(day).inDays == 1) return 'Yesterday';
  if (today.difference(day).inDays < 7) return DateFormat.E().format(time);
  return DateFormat.MMMd().format(time);
}

String dayLabel(DateTime time) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final day = DateTime(time.year, time.month, time.day);
  if (day == today) return 'Today';
  if (today.difference(day).inDays == 1) return 'Yesterday';
  return DateFormat.yMMMMd().format(time);
}

String lastSeenLabel(bool online, DateTime? lastSeen) {
  if (online) return 'Online';
  if (lastSeen == null) return 'Offline';
  return 'Last seen ${shortTime(lastSeen).toLowerCase() == 'yesterday' ? 'yesterday' : shortTime(lastSeen)}';
}
