#!/usr/bin/env bash
set -e

fmt() {
  local bytes=$1
  if [ "$bytes" -ge 1048576 ]; then
    echo "$(echo "scale=2; $bytes/1048576" | bc) MB"
  elif [ "$bytes" -ge 1024 ]; then
    echo "$(echo "scale=2; $bytes/1024" | bc) KB"
  else
    echo "${bytes} B"
  fi
}

CORE_RAW=$(wc -c < packages/core/dist/index.js | tr -d ' ')
CORE_GZ=$(gzip -c packages/core/dist/index.js | wc -c | tr -d ' ')
REACT_RAW=$(wc -c < packages/react/dist/index.js | tr -d ' ')
REACT_GZ=$(gzip -c packages/react/dist/index.js | wc -c | tr -d ' ')
NG_RAW=$(wc -c < packages/angular/dist/fesm2022/markitjs-angular.mjs | tr -d ' ')
NG_GZ=$(gzip -c packages/angular/dist/fesm2022/markitjs-angular.mjs | wc -c | tr -d ' ')

CORE_RAW_FMT=$(fmt $CORE_RAW)
CORE_GZ_FMT=$(fmt $CORE_GZ)
REACT_RAW_FMT=$(fmt $REACT_RAW)
REACT_GZ_FMT=$(fmt $REACT_GZ)
NG_RAW_FMT=$(fmt $NG_RAW)
NG_GZ_FMT=$(fmt $NG_GZ)

echo "📦 Bundle Size Report"
echo ""
# Table with box-drawing borders (column widths: 22, 12, 12, 12)
printf "┌──────────────────────┬────────────┬────────────┬────────────┐\n"
printf "│ %-20s │ %10s │ %10s │ %10s │\n" "Package" "Raw" "Gzipped" "Limit"
printf "├──────────────────────┼────────────┼────────────┼────────────┤\n"
printf "│ %-20s │ %10s │ %10s │ %10s │\n" "@markitjs/core" "$CORE_RAW_FMT" "$CORE_GZ_FMT" "15 KB"
printf "│ %-20s │ %10s │ %10s │ %10s │\n" "@markitjs/react" "$REACT_RAW_FMT" "$REACT_GZ_FMT" "3 KB"
printf "│ %-20s │ %10s │ %10s │ %10s │\n" "@markitjs/angular" "$NG_RAW_FMT" "$NG_GZ_FMT" "5 KB"
printf "└──────────────────────┴────────────┴────────────┴────────────┘\n"
echo ""
# Same limits as CI
FAILED=0
[ "$CORE_GZ" -gt 15360 ] && echo "❌ core over 15 KB gz" && FAILED=1 || echo "✅ core OK"
[ "$REACT_GZ" -gt 3072 ] && echo "❌ react over 3 KB gz" && FAILED=1 || echo "✅ react OK"
[ "$NG_GZ" -gt 5120 ] && echo "❌ angular over 5 KB gz" && FAILED=1 || echo "✅ angular OK"
exit $FAILED
