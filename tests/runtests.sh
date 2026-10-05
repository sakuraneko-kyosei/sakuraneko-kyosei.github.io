#!/bin/sh
# 使い方: sh tests/runtests.sh（python と node が要る。試験用の写しは tests/.work に作る）
# 試験用サーバーを止める → 試験用ディレクトリを作り直す → サーバーを起動 → 全試験 → サーバーを止める
cd "$(dirname "$0")" || exit 1
stop() { for p in $(netstat -ano | grep ":8765 " | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //PID "$p" //F >/dev/null 2>&1; done; }
stop
python -X utf8 -B prep.py >/dev/null || exit 1
(cd .work && python -X utf8 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
python -X utf8 -c "import time;time.sleep(2)"
r=$(node check.mjs 2>&1); echo "check.mjs OK$(echo "$r" | grep -c '^OK') NG$(echo "$r" | grep -cE '^NG|Error')"; echo "$r" | grep -E "^NG|Error" | head -5
for m in fresh saved url-wins broken-storage url-state url-page fetch-fail url-frac url-allcity url-empty; do
  r=$(node check_mem.mjs $m 2>&1); echo "$m OK$(echo "$r" | grep -c '^OK') NG$(echo "$r" | grep -cE '^NG|Error')"; echo "$r" | grep -E "^NG|Error" | head -3
done
stop
