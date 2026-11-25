# threadiaaistudios.com

Static site, no build step. Publish these: index.html, assets/, data/, previews/, art/.
Never publish tools/ (it holds local file paths).

Rebuild after new releases (WSL python3 for 1 and 2, Windows py 3.14 for 3 and 4):
1. agent_threads scripts/_site_channel_read.py  (fresh channel read, read only)
2. tools/build_manifest.py then tools/find_thumbs.py
3. tools/build_previews.py  (60 s previews from the loudest minute, our own made thumbnails)
4. tools/square_covers.py

Store: data/store.json. Put a checkout URL or per product links there once the payment provider is chosen.
News: data/news.json, refresh weekly. Never name a tool or vendor of ours anywhere on the site.
Local preview: python3 -m http.server 8765, then http://localhost:8765
