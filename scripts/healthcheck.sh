#!/bin/bash
# ============================================
# HEALTH CHECK SCRIPT
# ============================================
# Check if backend is responding
check_backend() {
  curl -f http://localhost:3000/health > /dev/null 2>&1
  return $?
}

# Check database connection
check_database() {
  pg_isready -h postgres -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1
  return $?
}

# Check Redis connection
check_redis() {
  redis-cli -h redis ping > /dev/null 2>&1
  return $?
}

# Main health check
main() {
  local failed=0
  
  if ! check_backend; then
    echo "❌ Backend health check failed"
    failed=1
  fi
  
  if ! check_database; then
    echo "❌ Database health check failed"
    failed=1
  fi
  
  if ! check_redis; then
    echo "❌ Redis health check failed"
    failed=1
  fi
  
  if [ $failed -eq 0 ]; then
    echo "✅ All health checks passed"
    exit 0
  else
    echo "⚠️ Some health checks failed"
    exit 1
  fi
}

main