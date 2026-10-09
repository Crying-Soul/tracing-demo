#!/usr/bin/env bash
# Критерий фазы 0: один запрос /ping виден в Tempo, Loki и Prometheus
set -euo pipefail

DOCKER=${DOCKER:-docker}
BACKEND_URL=${BACKEND_URL:-http://localhost:3000}
TIMEOUT=${TIMEOUT:-90}

trace_id=$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')
span_id=$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')

fetch() {
  "$DOCKER" exec prometheus wget -qO- "$1" 2>/dev/null || true
}

prom_value() {
  fetch "http://localhost:9090/api/v1/query?query=$1" | sed -n 's/.*"value":\[[^,]*,"\([^"]*\)".*/\1/p'
}

wait_for() {
  local name=$1 check=$2 deadline=$((SECONDS + TIMEOUT))
  until $check; do
    if ((SECONDS >= deadline)); then
      echo "FAIL $name"
      return 1
    fi
    sleep 3
  done
  echo "OK   $name"
}

ping_calls='sum(traces_spanmetrics_calls_total%7Bservice%3D%22backend%22%2Cspan_name%3D%22GET%20%2Fping%22%7D)'
calls_before=$(prom_value "$ping_calls")
calls_before=${calls_before:-0}

curl -fsS -o /dev/null -H "traceparent: 00-$trace_id-$span_id-01" "$BACKEND_URL/ping"
echo "trace_id $trace_id"

tempo_has_trace() {
  fetch "http://tempo:3200/api/v2/traces/$trace_id" | grep -q '"GET /ping"'
}

loki_has_log() {
  local query="%7Bservice_name%3D%22backend%22%7D%20%7C%20trace_id%3D%22$trace_id%22"
  fetch "http://loki:3100/loki/api/v1/query_range?query=$query&since=10m" | grep -q '"values":\[\['
}

counter_increased() {
  local now
  now=$(prom_value "$ping_calls")
  [[ -n $now ]] && awk -v a="$now" -v b="$calls_before" 'BEGIN { exit !(a > b) }'
}

event_loop_lag_present() {
  [[ -n $(prom_value 'nodejs_eventloop_delay_p99_seconds%7Bjob%3D%22backend%22%7D') ]]
}

status=0
wait_for "Tempo: трейс GET /ping" tempo_has_trace || status=1
wait_for "Loki: строка лога с trace_id" loki_has_log || status=1
wait_for "Prometheus: traces_spanmetrics_calls_total{span_name=\"GET /ping\"} вырос" counter_increased || status=1
wait_for "Prometheus: nodejs_eventloop_delay_p99_seconds" event_loop_lag_present || status=1
exit $status
