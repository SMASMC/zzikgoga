#!/usr/bin/env node
/*
  사전 커밋 점검 스크립트
  - 파일 인코딩(UTF-8) 손상 여부(� U+FFFD) 검사
  - ESLint 실행(주석 한글 강제 규칙 포함)
  - 이 스크립트는 새로 의존성 설치 없이 동작합니다.
*/

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// 스테이징된 파일 목록 가져오기
function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    })
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  } catch (e) {
    return []
  }
}

function checkUtf8ReplacementChar(files) {
  // 한글/이모지 깨짐이 발생하면 종종 U+FFFD(�)가 존재합니다.
  const bad = []
  for (const f of files) {
    try {
      const text = readFileSync(f, 'utf8')
      if (text.includes('\uFFFD')) {
        bad.push(f)
      }
    } catch (e) {
      // 바이너리/삭제 파일 등은 무시
    }
  }
  if (bad.length) {
    console.error('\n[실패] 인코딩 경고: 다음 파일에서 UTF-8 손상 가능성이 있습니다:')
    for (const f of bad) console.error('  -', f)
    console.error('\n각 파일을 UTF-8로 저장하고 재시도해주세요. (이모지/한글이 깨지지 않도록)')
    process.exit(1)
  }
}

function runEslint() {
  try {
    // 저장소 전체에 대해 빠르게 검사 (프로젝트 스크립트를 사용)
    execSync('npm run -s lint', { stdio: 'inherit' })
  } catch (e) {
    console.error('\n[실패] ESLint 규칙을 통과하지 못했습니다. (주석은 한글로 작성)')
    process.exit(1)
  }
}

const files = getStagedFiles()
if (files.length) {
  checkUtf8ReplacementChar(files)
}
runEslint()

process.exit(0)
