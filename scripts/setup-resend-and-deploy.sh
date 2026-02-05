#!/bin/bash
# Resend API 키 설정 + Functions 배포
# 사용법: ./scripts/setup-resend-and-deploy.sh
#
# 1. firebase login (브라우저 인증 필요)
# 2. firebase deploy --only functions
#    → RESEND_API_KEY 프롬프트 시 키 입력: re_JnTi8iF7_6e6fAFQEjYnRn64gzpCzcTgg

set -e
cd "$(dirname "$0")/.."

echo "=== Firebase Functions 배포 ==="
echo "RESEND_API_KEY가 아직 없으면 배포 시 프롬프트가 뜹니다."
echo "키: re_JnTi8iF7_6e6fAFQEjYnRn64gzpCzcTgg"
echo ""

if ! command -v firebase &>/dev/null; then
  echo "Firebase CLI가 없습니다. 설치: npm install -g firebase-tools"
  echo "또는: npx firebase-tools deploy --only functions"
  exit 1
fi

firebase deploy --only functions
