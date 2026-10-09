# Background noise for Goethe Hören

`utils/audioMixer.js` overlays one of these files (looped, ~12 % volume) on the
generated listening audio, chosen by the generator's `ambientScene`:

| Scene     | File                    | Use                                   |
|-----------|-------------------------|---------------------------------------|
| `cafe`    | `cafe.mp3`              | conversations in a café / canteen     |
| `street`  | `street.mp3`            | outdoor dialogues, traffic            |
| `office`  | `office.mp3`            | colleagues, phone calls at work       |
| `station` | `station.mp3`           | announcements at stations / airports  |
| `none`    | —                       | radio studio, lectures, interviews    |

`.wav`, `.ogg` and `.m4a` are also accepted. Use royalty-free / CC0 recordings
(30–120 s, steady ambience without speech you could understand). A missing
file is skipped with a warning; the voice still gets the room reverb.
