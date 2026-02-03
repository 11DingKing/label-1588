#!/bin/bash

# =============================================================================
# NestJS 用户认证系统 - 质检测试脚本
# =============================================================================
# 使用方法: ./scripts/qa-test.sh
# 前提条件: 确保 Docker 服务已启动 (docker-compose up -d)
# =============================================================================

# 不使用 set -e，让脚本继续执行所有测试

BASE_URL="${BASE_URL:-http://localhost:8081/api}"
PASSED=0
FAILED=0
TOKEN=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印分隔线
print_separator() {
    echo ""
    echo "============================================================================="
    echo ""
}

# 测试结果
test_result() {
    local name=$1
    local expected=$2
    local actual=$3
    
    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $name (expected: $expected, actual: $actual)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $name (expected: $expected, actual: $actual)"
        FAILED=$((FAILED + 1))
    fi
}

# 检查响应包含特定字段
check_response_field() {
    local name=$1
    local response=$2
    local field=$3
    
    if echo "$response" | grep -q "\"$field\""; then
        echo -e "${GREEN}✓ PASS${NC}: $name - 包含字段 '$field'"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $name - 缺少字段 '$field'"
        FAILED=$((FAILED + 1))
    fi
}

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║           NestJS 用户认证系统 - 自动化质检测试                              ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "测试目标: $BASE_URL"
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
print_separator

# =============================================================================
# 1. 健康检查测试
# =============================================================================
echo -e "${YELLOW}[1/7] 健康检查测试${NC}"
echo "---------------------------------------------"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

test_result "健康检查接口状态码" "200" "$HEALTH_CODE"
check_response_field "健康检查响应" "$HEALTH_BODY" "status"
check_response_field "健康检查响应" "$HEALTH_BODY" "timestamp"

print_separator

# =============================================================================
# 2. 用户注册测试
# =============================================================================
echo -e "${YELLOW}[2/7] 用户注册测试${NC}"
echo "---------------------------------------------"

TIMESTAMP=$(date +%s)
TEST_USER="qatest_${TIMESTAMP}"
TEST_EMAIL="qa_${TIMESTAMP}@test.com"
TEST_PASSWORD="QaTest123456"

# 正常注册
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER\", \"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
REGISTER_CODE=$(echo "$REGISTER_RESPONSE" | tail -1)
REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed '$d')

test_result "用户注册状态码" "201" "$REGISTER_CODE"
check_response_field "注册响应" "$REGISTER_BODY" "accessToken"
check_response_field "注册响应" "$REGISTER_BODY" "tokenType"
check_response_field "注册响应" "$REGISTER_BODY" "expiresIn"

# 重复注册测试（应该失败）
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$TEST_USER\", \"email\": \"duplicate@test.com\", \"password\": \"$TEST_PASSWORD\"}")
DUPLICATE_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -1)

test_result "重复用户名注册被拒绝" "409" "$DUPLICATE_CODE"

# 无效邮箱测试
INVALID_EMAIL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"newuser123\", \"email\": \"invalid-email\", \"password\": \"$TEST_PASSWORD\"}")
INVALID_EMAIL_CODE=$(echo "$INVALID_EMAIL_RESPONSE" | tail -1)

test_result "无效邮箱格式被拒绝" "400" "$INVALID_EMAIL_CODE"

# 短密码测试
SHORT_PWD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"newuser456\", \"email\": \"new@test.com\", \"password\": \"123\"}")
SHORT_PWD_CODE=$(echo "$SHORT_PWD_RESPONSE" | tail -1)

test_result "短密码被拒绝" "400" "$SHORT_PWD_CODE"

print_separator

# =============================================================================
# 3. 用户登录测试
# =============================================================================
echo -e "${YELLOW}[3/7] 用户登录测试${NC}"
echo "---------------------------------------------"

# 用户名登录
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"account\": \"$TEST_USER\", \"password\": \"$TEST_PASSWORD\"}")
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

test_result "用户名登录状态码" "201" "$LOGIN_CODE"
check_response_field "登录响应" "$LOGIN_BODY" "accessToken"

# 提取 Token
TOKEN=$(echo "$LOGIN_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "获取到 Token: ${TOKEN:0:20}..."

# 邮箱登录
EMAIL_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"account\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")
EMAIL_LOGIN_CODE=$(echo "$EMAIL_LOGIN_RESPONSE" | tail -1)

test_result "邮箱登录状态码" "201" "$EMAIL_LOGIN_CODE"

# 错误密码登录
WRONG_PWD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"account\": \"$TEST_USER\", \"password\": \"wrongpassword\"}")
WRONG_PWD_CODE=$(echo "$WRONG_PWD_RESPONSE" | tail -1)

test_result "错误密码登录被拒绝" "401" "$WRONG_PWD_CODE"

# 不存在用户登录
NONEXIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"account\": \"nonexistentuser\", \"password\": \"$TEST_PASSWORD\"}")
NONEXIST_CODE=$(echo "$NONEXIST_RESPONSE" | tail -1)

test_result "不存在用户登录被拒绝" "401" "$NONEXIST_CODE"

print_separator

# =============================================================================
# 4. JWT 认证测试
# =============================================================================
echo -e "${YELLOW}[4/7] JWT 认证测试${NC}"
echo "---------------------------------------------"

# 有效 Token 获取用户信息
PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $TOKEN")
PROFILE_CODE=$(echo "$PROFILE_RESPONSE" | tail -1)
PROFILE_BODY=$(echo "$PROFILE_RESPONSE" | sed '$d')

test_result "有效Token获取用户信息" "200" "$PROFILE_CODE"
check_response_field "用户信息响应" "$PROFILE_BODY" "username"
check_response_field "用户信息响应" "$PROFILE_BODY" "email"

# 检查密码不在响应中
if echo "$PROFILE_BODY" | grep -q '"password"'; then
    echo -e "${RED}✗ FAIL${NC}: 用户信息响应不应包含密码字段"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ PASS${NC}: 用户信息响应正确隐藏密码字段"
    PASSED=$((PASSED + 1))
fi

# 无 Token 访问
NO_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/profile")
NO_TOKEN_CODE=$(echo "$NO_TOKEN_RESPONSE" | tail -1)

test_result "无Token访问被拒绝" "401" "$NO_TOKEN_CODE"

# 无效 Token 访问
INVALID_TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer invalid-token-here")
INVALID_TOKEN_CODE=$(echo "$INVALID_TOKEN_RESPONSE" | tail -1)

test_result "无效Token访问被拒绝" "401" "$INVALID_TOKEN_CODE"

print_separator

# =============================================================================
# 5. Token 刷新测试
# =============================================================================
echo -e "${YELLOW}[5/7] Token 刷新测试${NC}"
echo "---------------------------------------------"

REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/refresh" \
    -H "Authorization: Bearer $TOKEN")
REFRESH_CODE=$(echo "$REFRESH_RESPONSE" | tail -1)
REFRESH_BODY=$(echo "$REFRESH_RESPONSE" | sed '$d')

test_result "Token刷新状态码" "201" "$REFRESH_CODE"
check_response_field "刷新响应" "$REFRESH_BODY" "accessToken"

# 验证新 Token 存在
NEW_TOKEN=$(echo "$REFRESH_BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || true)
if [ -n "$NEW_TOKEN" ]; then
    echo -e "${GREEN}✓ PASS${NC}: 刷新后获得新Token"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: Token刷新异常 - 未获取到新Token"
    FAILED=$((FAILED + 1))
fi

print_separator

# =============================================================================
# 6. 用户管理接口测试
# =============================================================================
echo -e "${YELLOW}[6/7] 用户管理接口测试${NC}"
echo "---------------------------------------------"

# 获取用户列表
USERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $TOKEN")
USERS_CODE=$(echo "$USERS_RESPONSE" | tail -1)
USERS_BODY=$(echo "$USERS_RESPONSE" | sed '$d')

test_result "获取用户列表状态码" "200" "$USERS_CODE"
check_response_field "用户列表响应" "$USERS_BODY" "items"
check_response_field "用户列表响应" "$USERS_BODY" "total"
check_response_field "用户列表响应" "$USERS_BODY" "page"

# 分页查询
PAGE_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users?page=1&pageSize=5" \
    -H "Authorization: Bearer $TOKEN")
PAGE_CODE=$(echo "$PAGE_RESPONSE" | tail -1)

test_result "分页查询状态码" "200" "$PAGE_CODE"

# 未授权访问用户列表
UNAUTH_USERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users")
UNAUTH_USERS_CODE=$(echo "$UNAUTH_USERS_RESPONSE" | tail -1)

test_result "未授权访问用户列表被拒绝" "401" "$UNAUTH_USERS_CODE"

print_separator

# =============================================================================
# 7. 响应格式验证
# =============================================================================
echo -e "${YELLOW}[7/7] 响应格式验证${NC}"
echo "---------------------------------------------"

# 验证成功响应格式
check_response_field "成功响应格式" "$LOGIN_BODY" "code"
check_response_field "成功响应格式" "$LOGIN_BODY" "message"
check_response_field "成功响应格式" "$LOGIN_BODY" "data"
check_response_field "成功响应格式" "$LOGIN_BODY" "timestamp"

# 验证错误响应格式
ERROR_BODY=$(echo "$WRONG_PWD_RESPONSE" | sed '$d')
check_response_field "错误响应格式" "$ERROR_BODY" "code"
check_response_field "错误响应格式" "$ERROR_BODY" "message"
check_response_field "错误响应格式" "$ERROR_BODY" "error"
check_response_field "错误响应格式" "$ERROR_BODY" "traceId"

# 验证响应头
TRACE_ID_HEADER=$(curl -s -I -X GET "$BASE_URL/health" | grep -i "x-trace-id" || true)
if [ -n "$TRACE_ID_HEADER" ]; then
    echo -e "${GREEN}✓ PASS${NC}: 响应包含 X-Trace-Id 头"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}: 响应缺少 X-Trace-Id 头"
    FAILED=$((FAILED + 1))
fi

print_separator

# =============================================================================
# 测试结果汇总
# =============================================================================
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                           测试结果汇总                                     ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

TOTAL=$((PASSED + FAILED))
echo "总测试数: $TOTAL"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ 所有测试通过！项目质量验收通过。${NC}"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}✗ 存在 $FAILED 个测试失败，请检查。${NC}"
    echo ""
    exit 1
fi
