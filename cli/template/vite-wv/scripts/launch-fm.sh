source .env
SERVER_HOST=$(echo $FM_SERVER | sed 's|https://||' | sed 's|/.*||')
open "fmp://$SERVER_HOST/$FM_DATABASE?script=Launch Web Viewer for Dev"
