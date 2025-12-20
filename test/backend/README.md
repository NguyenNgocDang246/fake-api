# Backend Unit Test Plan

Tài liệu này định nghĩa **toàn bộ suite + test case** cần có cho backend (routes + services) trong repo này.

## 1) Nguyên tắc chung

### Mục tiêu
- Unit test **route handlers** trong `src/app/api/**/route.ts` (không cần chạy Next server).
- Unit test **services** trong `src/server/services/**`.
- Không phụ thuộc DB/network thật: **mock Prisma**, **mock Resend**, **mock Google APIs**, **mock cookies/NextResponse**.

### Đề xuất test runner
Repo hiện chưa có test runner trong `package.json`. Khuyến nghị:
- `vitest` (environment `node`) + `@vitest/coverage-v8`
- Mock ESM tốt, chạy TS nhanh, phù hợp unit test.

### Quy ước file test (gợi ý)
- Routes: `test/backend/routes/<path>.route.test.ts`
- Services: `test/backend/services/<service>.test.ts`
- Mocks/helpers: `test/backend/helpers/**`

### Mocking/fixtures tối thiểu (khuyến nghị)
- Mock Next:
  - `next/server`: `NextResponse.json`, `NextResponse.redirect`, `NextResponse.rewrite`
  - `next/headers`: `cookies()` trả về cookieStore giả (`get(name)`).
- Mock Prisma: mock module `src/server/prisma/prisma_provider.ts` để export `prisma` giả (với các method `.findUnique`, `.findMany`, `.create`, `.update`, `.delete`, `.deleteMany`, `.findFirst`).
- Mock services phụ thuộc:
  - `src/server/services/auth/token.service.ts`
  - `src/server/services/mail/mail.service.ts`
  - `src/server/services/auth/hash.service.ts` (argon2)
  - `googleapis` + `oauth2Client` trong `src/app/api/auth/google/google.OAuth2.ts`
- Chuẩn assert response:
  - `res.status`
  - body JSON `{ status: "success" | "error", data?, message?, errors? }` (trừ `204` trả body null)
  - `res.headers.get("Set-Cookie")`, `res.headers.get("Location")`
- Với `delay_ms` trong fake API: dùng fake timers (`useFakeTimers`) để không sleep thật.

## 2) Route unit tests (`src/app/api/**/route.ts`)

### 2.1 `src/app/api/auth/check/route.ts` (GET)
- [ ] Trả `200` với body `{ status: "success", data: null }`.

### 2.2 `src/app/api/auth/login/route.ts` (POST)
**Happy path**
- [ ] Body hợp lệ (email/password), `authService.login` trả 2 token → `200 success`.
- [ ] Có header `Set-Cookie` gồm **2 cookie**: `access_token` (path `/`) và `refresh_token` (path `API_ROUTES.AUTH.REFRESH_TOKEN`).
- [ ] `NODE_ENV=production` → cookie `secure=true`; `NODE_ENV!=production` → `secure=false`.

**Validation (LoginSchema strict)**
- [ ] Thiếu `email`.
- [ ] Thiếu `password`.
- [ ] `email` sai format.
- [ ] `password` < 6 ký tự / > 255 ký tự.
- [ ] Có field dư (ví dụ `role`, `foo`) → `400` (do `.strict()`).
- [ ] `req.json()` ném lỗi (invalid JSON) → `500` generic error.

**Error handling**
- [ ] `authService.login` throw `AppError` → trả đúng `statusCode/message`.
- [ ] `authService.login` throw error thường → `500` generic error.

### 2.3 `src/app/api/auth/register/route.ts` (POST)
**Happy path**
- [ ] Body hợp lệ, `UserService.getUserByEmail` trả null → đăng ký thành công.
- [ ] `authService.register` được gọi với password đã hash (mock hash ở service).
- [ ] `TokenService.createVerifyEmailToken` được gọi với `{ id, token_version }`.
- [ ] `MailService.sendVerificationEmail` được gọi đúng `to/token`.
- [ ] Response `200 success` có `data` đúng shape `UserInfoSchema` (`public_id`, `name`, `email`).

**Validation (RegisterSchema strict)**
- [ ] Thiếu `name`.
- [ ] `name` rỗng / >255.
- [ ] Thiếu `email` / `email` sai format / >255.
- [ ] Thiếu `password` / <6 / >255.
- [ ] Có field dư → `400`.
- [ ] `req.json()` ném lỗi → `500`.

**Business rules**
- [ ] Email đã tồn tại (`UserService.getUserByEmail` trả user) → `409` với `AUTH_MESSAGES.EMAIL_DUPLICATED`.

**Error handling**
- [ ] `authService.register` throw `AppError` → mapping status/message.
- [ ] `TokenService.createVerifyEmailToken` throw → mapping theo catch (AppError/generic).
- [ ] `MailService.sendVerificationEmail` throw → mapping.
- [ ] Validate `UserInfoSchema` fail (IdConverter/mock data xấu) → `400`.

### 2.4 `src/app/api/auth/logout/route.ts` (GET)
- [ ] Trả `200 success`.
- [ ] Header `Set-Cookie` gồm 2 cookie bị xóa (`maxAge=0`): `access_token` (path `/`) và `refresh_token` (path `/api/auth/refresh-token`).
- [ ] `NODE_ENV=production` ảnh hưởng `secure` tương tự login.

### 2.5 `src/app/api/auth/refresh-token/route.ts` (GET)
**Happy path**
- [ ] Có cookie `refresh_token`, token hợp lệ, user tồn tại, `token_version` khớp → set cookie `access_token`, `200 success`.

**Input/cookie**
- [ ] Không có cookie `refresh_token` → `400` `TOKEN_MESSAGE.INVALID_REFRESH_TOKEN`.

**Token/user checks**
- [ ] `tokenService.verifyRefreshToken` throw `AppError` → mapping status/message.
- [ ] `userService.getUserById` trả null → `401` `TOKEN_MESSAGE.INVALID_EXPIRED_REFRESH_TOKEN`.
- [ ] `user.token_version !== payload.token_version` → `401` `TOKEN_MESSAGE.INVALID_EXPIRED_REFRESH_TOKEN`.

**Cookie options**
- [ ] `Set-Cookie` chỉ gồm `access_token` (không set `refresh_token`).
- [ ] `path=/`, `httpOnly=true`, `sameSite=strict`, `maxAge=ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS`.

### 2.6 `src/app/api/auth/password/forgot/route.ts` (POST)
**Happy path**
- [ ] Email hợp lệ, user tồn tại + `is_verified=true` → tạo reset token + gửi mail → `200 success`.

**Privacy behavior (không lộ thông tin)**
- [ ] User không tồn tại → vẫn `200 success` và **không** gọi send mail.
- [ ] User tồn tại nhưng `is_verified=false` → vẫn `200 success` và **không** gửi mail.

**Validation**
- [ ] Thiếu email / email sai format → `400` validation error.
- [ ] `req.json()` ném lỗi → `500`.

**Error handling**
- [ ] `TokenService.createResetPasswordToken` throw `AppError` → mapping.
- [ ] `MailService.sendForgotPasswordEmail` throw → mapping.

### 2.7 `src/app/api/auth/password/reset/route.ts` (POST)
**Happy path**
- [ ] Có `token`, token hợp lệ, user tồn tại, `token_version` khớp, password hợp lệ → update password + tăng `token_version` + clear cookies → `200 success`.

**Token presence**
- [ ] Thiếu `token` → `400` `TOKEN_MESSAGE.INVALID_TOKEN`.

**Token validity**
- [ ] `TokenService.verifyResetPasswordToken` throw (token invalid/expired) → `401` `TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN`.
- [ ] Payload trả về nhưng fail `ResetPasswordTokenPayloadSchema` → `400` validation error.

**User checks**
- [ ] User không tồn tại → `401` `TOKEN_MESSAGE.INVALID_TOKEN`.
- [ ] `user.token_version !== token_version` → `401` `TOKEN_MESSAGE.INVALID_TOKEN`.

**Password validation**
- [ ] Thiếu `password` / <6 / >255 → `400`.

**Side effects**
- [ ] `AuthService.updatePassword` được gọi với `{ id, password }`.
- [ ] `UserService.increaseTokenVersion` được gọi đúng `{ id }`.
- [ ] `Set-Cookie` clear cả `access_token` + `refresh_token`.

**Error handling**
- [ ] `AuthService.updatePassword` throw `AppError` → mapping.
- [ ] `UserService.increaseTokenVersion` throw → mapping.

### 2.8 `src/app/api/auth/email/verify/route.ts` (POST)
**Happy path**
- [ ] Có `token`, token hợp lệ, user tồn tại, `token_version` khớp → verify email + tăng token_version → `200 success`.

**Token presence/validity**
- [ ] Thiếu `token` → `400` `TOKEN_MESSAGE.INVALID_TOKEN`.
- [ ] `TokenService.verifyVerifyEmailToken` throw invalid/expired → `401` `TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN`.
- [ ] Payload fail `VerifyEmailTokenPayloadSchema` → `400`.

**User checks**
- [ ] User không tồn tại → `401` `TOKEN_MESSAGE.INVALID_TOKEN`.
- [ ] Token_version mismatch → `401` `TOKEN_MESSAGE.INVALID_TOKEN`.

**Side effects**
- [ ] `UserService.verifyUserEmail` được gọi.
- [ ] `UserService.increaseTokenVersion` được gọi.

### 2.9 `src/app/api/auth/email/resend/route.ts` (POST)
**Happy path**
- [ ] Email hợp lệ, user tồn tại + `is_verified=false` → tạo verify token + gửi mail → `200 success`.

**Privacy/no-op**
- [ ] User không tồn tại → `200 success`, không gửi mail.
- [ ] User đã verified → `200 success`, không gửi mail.

**Validation & errors**
- [ ] Email invalid/missing → `400`.
- [ ] TokenService/MailService throw `AppError` → mapping.
- [ ] `req.json()` ném lỗi → `500`.

### 2.10 `src/app/api/auth/google/route.ts` (GET)
- [ ] `oauth2Client.generateAuthUrl` trả URL → `200 success` với `data.url`.
- [ ] `generateAuthUrl` throw → `500` generic error.

### 2.10.1 `src/app/api/auth/google/google.OAuth2.ts`
- [ ] Tạo `oauth2Client` với redirect URL `${DOMAIN}/api/auth/google/callback`.
- [ ] Khi `DOMAIN` thay đổi → redirect URL thay đổi tương ứng (test bằng reset module + import lại).
- [ ] Thiếu `GOOGLE_CLIENT_ID` hoặc `GOOGLE_CLIENT_SECRET` (runtime undefined) → ghi nhận behavior hiện tại (có thể tạo client nhưng callback/login sẽ fail về sau).

### 2.11 `src/app/api/auth/google/callback/route.ts` (GET)
**Happy path**
- [ ] Có `code`, lấy token, lấy profile (`email`,`name`), user tồn tại → loginWithGoogle → response là redirect tới `PAGE_ROUTES.PROJECT` + set 2 cookie.
- [ ] User chưa tồn tại → gọi `AuthService.registerWithGoogle` trước, rồi loginWithGoogle, rồi redirect.

**Input**
- [ ] Thiếu `code` → `400` `GOOGLE_AUTH_MESSAGES.NO_CODE`.

**Google profile**
- [ ] `data.email == null` → `400` `GOOGLE_AUTH_MESSAGES.NO_EMAIL`.
- [ ] `data.name == null` → `400` `GOOGLE_AUTH_MESSAGES.NO_NAME`.

**Cookies/redirect**
- [ ] Response là `NextResponse.redirect` có `Location` đúng.
- [ ] `Set-Cookie` gồm `access_token` + `refresh_token` như login route.

**Error handling**
- [ ] `oauth2Client.getToken` throw → `500` generic error.
- [ ] `AuthService.registerWithGoogle/loginWithGoogle` throw `AppError` → mapping JSON error (không redirect).

### 2.12 `src/app/api/user/route.ts` (GET)
**Happy path**
- [ ] Header `x-userId` hợp lệ, user tồn tại → `200 success` với `UserInfoSchema`.

**Auth/header**
- [ ] Thiếu/invalid `x-userId` khiến `GetUserByIdSchema.parse` fail → hiện tại route sẽ rơi vào catch generic → `500` (ghi nhận theo behavior hiện có).

**User not found**
- [ ] `UserService.getUserById` trả null → `401` `ERROR_MESSAGES.UNAUTHORIZED`.

**Validation**
- [ ] validateData(UserInfoSchema) fail → `400` validation error.

### 2.13 `src/app/api/project/route.ts` (GET/POST/DELETE)
**GET**
- [ ] `x-userId` hợp lệ, có projects → `200 success` với mảng `ProjectInfoSchema`.
- [ ] Không có project → `204` (ApiResponse.error với `STATUS_CODE.NO_CONTENT` trả body null).
- [ ] validateData([ProjectInfoSchema]) fail → `400`.
- [ ] Thiếu/invalid `x-userId` → hiện tại rơi vào `500` generic.

**POST**
- [ ] Body hợp lệ → `createProject` được gọi với `user_id` từ header → `200 success` với `ProjectInfoSchema`.
- [ ] Validation fail: thiếu `name`, `name` rỗng, `description` >255, field dư → `400`.
- [ ] validateData(ProjectInfoSchema) fail → `400`.

**DELETE**
- [ ] Có bản ghi bị xóa (`deleted.count>0`) → `200 success`.
- [ ] `deleted.count===0` → `204`.

### 2.14 `src/app/api/project/[projectId]/route.ts` (GET/PUT/DELETE)
**GET**
- [ ] Project tồn tại + thuộc user → `200 success` với `ProjectInfoSchema`.
- [ ] Project không tồn tại → `404` `ERROR_MESSAGES.NOT_FOUND`.
- [ ] Không thuộc user → `403` `ERROR_MESSAGES.FORBIDDEN`.

**PUT**
- [ ] Project tồn tại + thuộc user + body hợp lệ → `200 success` `ProjectInfoSchema`.
- [ ] Project không tồn tại → `204` `ERROR_MESSAGES.NO_CONTENT`.
- [ ] Không thuộc user → `403`.
- [ ] Body invalid/field dư → `400`.

**DELETE**
- [ ] Project tồn tại + thuộc user → `200 success`.
- [ ] Project không tồn tại → `204`.
- [ ] Không thuộc user → `403`.

**Params**
- [ ] `projectId` public id decode ra `-1n` → route vẫn gọi service; test để đảm bảo behavior hiện tại trả `404` (GET) / `204` (PUT/DELETE) khi service trả null.

### 2.15 `src/app/api/project/[projectId]/endpoint-group/route.ts` (GET/POST)
**GET**
- [ ] Có permission (ProjectService.checkPermission=true) + có endpoint groups → `200 success` mảng `EndpointGroupInfoSchema`.
- [ ] Không có permission → `403`.
- [ ] Danh sách rỗng → `204`.
- [ ] validateData([EndpointGroupInfoSchema]) fail → `400`.

**POST**
- [ ] Permission OK + body hợp lệ → `200 success` với `EndpointGroupInfoSchema`.
- [ ] Permission fail → `403`.
- [ ] Body invalid/field dư → `400`.

### 2.16 `src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/route.ts` (GET/PUT/DELETE)
**Common**
- [ ] Permission OK/FAIL theo `endpointGroupService.checkPermission`.
- [ ] `projectId`/`endpointGroupId` decode ra `-1n` → vẫn validate OK; test behavior theo service.

**GET**
- [ ] Tồn tại → `200 success` `EndpointGroupInfoSchema`.
- [ ] Không tồn tại → `404`.

**PUT**
- [ ] Update OK + validate output OK → `200 success`.
- [ ] Update trả falsy → `204`.
- [ ] Body invalid/field dư → `400`.

**DELETE**
- [ ] Delete OK → `200 success`.
- [ ] Delete trả falsy → `204`.

### 2.17 `src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/route.ts` (GET/POST/DELETE)
**GET**
- [ ] Permission OK + có endpoints → `200 success` mảng `EndpointInfoSchema`.
- [ ] Permission fail → `403`.
- [ ] List rỗng → `204`.
- [ ] `response_body` không phải object (vd string/array/null) → validateData fail → `400`.

**POST**
- [ ] Permission OK + body hợp lệ → `200 success` `EndpointInfoSchema`.
- [ ] Endpoint trùng path+method (`EndpointService.getEndpointByPath` trả record) → `409` `ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED`.
- [ ] Body invalid:
  - [ ] `path` sai regex hoặc quá dài.
  - [ ] `method` ngoài enum.
  - [ ] `status_code`/`delay_ms` không parse được (NaN) hoặc thiếu.
  - [ ] `response_body` không phải JSON object string (ví dụ `"[]"`, `"\"a\""`, `"not-json"`).
  - [ ] Field dư → `400`.

**DELETE**
- [ ] `deleteAllEndpoints.count>0` → `200 success`.
- [ ] `count===0` → `204`.

### 2.18 `src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route.ts` (GET/PUT/DELETE)
**GET**
- [ ] Permission OK + endpoint tồn tại + đúng `endpoint_groups_id` → `200 success` `EndpointInfoSchema`.
- [ ] Permission fail → `403`.
- [ ] Endpoint không tồn tại → `404`.
- [ ] Endpoint tồn tại nhưng `endpoint.endpoint_groups_id !== endpointGroupId` → `403`.
- [ ] Output validate fail → `400`.

**PUT**
- [ ] Permission OK + body hợp lệ + update OK → `200 success` `EndpointInfoSchema`.
- [ ] Update trả falsy → `204`.
- [ ] Body invalid tương tự create endpoint (strict + response_body JSON object string) → `400`.

**DELETE**
- [ ] Delete OK → `200 success`.
- [ ] Delete trả falsy → `204`.

### 2.19 `src/app/api/fake/[projectId]/route.ts` (GET/POST/PUT/PATCH/DELETE)
Lưu ý: route này tự parse `req.nextUrl.pathname` để lấy `publicId` + `pathname` và dùng `EndpointService.getEndpointByPath`.

**NOT_FOUND / method**
- [ ] Không tìm thấy publicId (pathname rỗng/không đủ segment) → `404` NOT_FOUND.
- [ ] Không tìm thấy endpoint (`getEndpointByPath` trả null) → `404`.
- [ ] Endpoint trả về nhưng `method` không khớp method đang gọi → `405` METHOD_NOT_ALLOWED.

**Validation/response**
- [ ] Endpoint record invalid khiến `EndpointResponseSchema` fail → `400` validation error response.
- [ ] `status_code===204` → trả `204` với body null.
- [ ] `status_code` khác → trả JSON `response_body` với status tương ứng (default 200 nếu falsy).

**Delay**
- [ ] `delay_ms` > 0 → có sleep đúng thời lượng (dùng fake timers để assert).

## 3) Service unit tests (`src/server/services/**`)

### 3.1 `src/server/services/auth/auth.service.ts`
**register**
- [ ] Email đã tồn tại (`userService.getUserByEmail` trả user) → throw `AppError` `400` `AUTH_MESSAGES.EMAIL_DUPLICATED`.
- [ ] Email mới → gọi `hashPassword` + `userService.createUser` với password đã hash.
- [ ] `hashPassword` throw → throw `AppError` (default 500).
- [ ] `createUser` throw error thường → wrap thành `AppError`.
- [ ] `createUser` throw `AppError` → propagate.

**registerWithGoogle**
- [ ] Generate password từ `Date.now()` + `DUMMY_PASSWORD_SALT` (có/không có env) → gọi `register`.
- [ ] Sau register → gọi `userService.verifyUserEmail`.
- [ ] register/verifyUserEmail throw → wrap/propgate `AppError`.

**login**
- [ ] User không tồn tại → throw `401` `AUTH_MESSAGES.INVALID_CREDENTIALS`.
- [ ] User chưa verified:
  - [ ] Gọi `tokenService.createVerifyEmailToken` + `MailService.sendVerificationEmail`.
  - [ ] Sau đó throw `403` `AUTH_MESSAGES.EMAIL_NOT_VERIFIED`.
- [ ] verifyPassword=false → throw `401` invalid credentials.
- [ ] verifyPassword=true → tạo refresh+access token, trả đúng `LoginResponseSchema`.
- [ ] `LoginResponseSchema.parse` fail (token không phải string) → throw `AppError` (default 500).

**loginWithGoogle**
- [ ] User không tồn tại → throw `401` invalid credentials.
- [ ] User tồn tại → tạo tokens + parse `LoginResponseSchema`.

**updatePassword**
- [ ] User không tồn tại → throw `204` `AUTH_MESSAGES.USER_NOT_FOUND` (theo code hiện tại).
- [ ] User tồn tại → hash password + `userService.updatePassword`.

### 3.2 `src/server/services/auth/token.service.ts`
**createAccessToken**
- [ ] Input id → output là string JWT.
- [ ] Payload chứa `public_id` đúng với `IdConverter.encode(id)` (có thể verify bằng `jwtVerify`).
- [ ] SignJWT throw → throw `AppError` default 500.

**verifyAccessToken**
- [ ] Token hợp lệ → trả `{ id }` đúng.
- [ ] Token invalid/expired → throw `401` `TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN`.
- [ ] Payload thiếu/sai `public_id` → decode ra `-1n` (behavior hiện có) → trả id `-1n` (test để ghi nhận).

**createRefreshToken / verifyRefreshToken**
- [ ] Token hợp lệ → parse `token_version` về `BigInt`.
- [ ] Invalid token → throw `AppError` default 500 (behavior hiện có; không set message/status).

**createResetPasswordToken / verifyResetPasswordToken**
- [ ] Token invalid/expired → throw `401` `TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN`.
- [ ] Token hợp lệ → trả `{ id, token_version }`.

**createVerifyEmailToken / verifyVerifyEmailToken**
- [ ] Token invalid/expired → throw `401` `TOKEN_MESSAGE.INVALID_EXPIRED_TOKEN`.
- [ ] Token hợp lệ → trả `{ id, token_version }`.

### 3.3 `src/server/services/auth/hash.service.ts`
- [ ] `hashPassword(password)` gọi `argon2.hash(password)` và trả string hash.
- [ ] `verifyPassword(password, hash)` gọi `argon2.verify(hash, password)` và trả boolean.
- [ ] argon2 throw → propagate lỗi.

### 3.4 `src/server/services/user.service.ts`
Mock toàn bộ `prisma.users.*`.
- [ ] `getAllUsers` → return list / wrap lỗi thành `AppError`.
- [ ] `createUser` → tạo user / wrap lỗi.
- [ ] `getUserById`/`getUserByEmail` → return user|null / wrap lỗi.
- [ ] `verifyUserEmail` → gọi update `{ is_verified: true }` / wrap lỗi.
- [ ] `updatePassword` → gọi update `{ password }` / wrap lỗi.
- [ ] `increaseTokenVersion` → gọi update `{ token_version: { increment: 1 } }` / wrap lỗi.

### 3.5 `src/server/services/project.service.ts`
Mock `prisma.projects.*`.
- [ ] `checkPermission`:
  - [ ] findUnique trả record → true; null → false.
  - [ ] prisma throw → ném lỗi raw (không wrap) (ghi nhận behavior hiện có).
- [ ] `getAllProjects`/`getAllProjectsByUserId`/`getProjectById` → return/wrap lỗi thành `AppError`.
- [ ] `deleteAllProjectsByUserId`/`deleteProjectById` → return/wrap lỗi.
- [ ] `updateProjectById`: `description` undefined → lưu `null` (assert data gửi prisma).
- [ ] `createProject`: connect user theo `{ users: { connect: { id: user_id }}}` và `description` undefined → `null`.

### 3.6 `src/server/services/endpoint_group.service.ts`
Mock `prisma.endpoint_groups.*`.
- [ ] `checkPermission`:
  - [ ] findUnique trả record → true; null → false.
  - [ ] prisma throw → ném lỗi raw (không wrap).
- [ ] CRUD còn lại wrap lỗi thành `AppError`.

### 3.7 `src/server/services/endpoint.service.ts`
Mock `prisma.endpoints.*`.
- [ ] `checkPermissions`:
  - [ ] findUnique trả record → true; null → false.
  - [ ] prisma throw → ném lỗi raw (không wrap).
- [ ] `createEndpoint`/`getEndpointById`/`getEndpointByPath`/`getAllEndpoints`/`deleteEndpointById`/`deleteAllEndpoints`/`updateEndpointById`:
  - [ ] return đúng data từ prisma.
  - [ ] prisma throw error thường → wrap thành `AppError`.

### 3.8 `src/server/services/mail/mail.service.ts`
Mock `resend.emails.send` + template renderers.

**sendEmail**
- [ ] Gọi `resend.emails.send` với `from="Fake API <support@fake-api.dev>"` + `to/subject/html`.
- [ ] resend throw error thường → wrap thành `AppError`.
- [ ] resend throw `AppError` → propagate.

**sendVerificationEmail**
- [ ] Render template với `link = DOMAIN + PAGE_ROUTES.AUTH.EMAIL.VERIFY + "?token=..."`
- [ ] Gọi `sendEmail` subject `"Verify Email"`.
- [ ] Template/render/sendEmail throw → wrap/propgate.

**sendForgotPasswordEmail**
- [ ] Render template với `link = DOMAIN + PAGE_ROUTES.AUTH.PASSWORD.RESET + "?token=..."`
- [ ] Gọi `sendEmail` subject `"Forgot Password"`.
- [ ] Error handling tương tự.

### 3.9 Mail templates

#### `src/server/services/mail/mail_template/verify_email/verify_email.ts`
- [ ] Replace `{{ link }}` và `{{ email }}` trên toàn bộ template (global replace).
- [ ] Props chứa ký tự regex đặc biệt (ví dụ email có `+`) vẫn replace đúng (do dùng RegExp theo key, không theo value).

#### `src/server/services/mail/mail_template/verify_email/verify_email_template.ts`
- [ ] Template chứa placeholder `{{ link }}` và `{{ email }}` (đúng key) để renderer có thể replace.
- [ ] Template là string non-empty (không bị export sai/undefined).

#### `src/server/services/mail/mail_template/forgot_password/forgot_password.ts`
- [ ] Replace `{{link}}` và `{{email}}` (khác spacing với verify template) đúng toàn bộ template.

#### `src/server/services/mail/mail_template/forgot_password/forgot_password_template.ts`
- [ ] Template chứa placeholder `{{link}}` và `{{email}}` (đúng key) để renderer có thể replace.
- [ ] Template là string non-empty.

## 4) Coverage checklist (đảm bảo “quét đủ case”)
- [ ] Mỗi route: happy path + validation fail + permission/auth fail + dependency throw AppError + dependency throw non-AppError + headers/cookies/redirect/no-content.
- [ ] Mỗi service: success + input edge + dependency throw + wrap/propgate AppError đúng.
- [ ] Các schema `.strict()` luôn có test “field dư”.
- [ ] Các case `204 NO_CONTENT` luôn assert body null + status 204.
