# Google 계정 로그인 설정

앱은 Google로 인증한 `phlogos1@gmail.com`만 Supabase의 `sangbogi` 기록에 접근하도록 바뀌었습니다. OAuth 로그인에는 Google 웹 클라이언트 자격 정보가 필요합니다. 이 값은 아직 발급·등록되지 않았으며, 운영 Supabase 설정과 데이터베이스도 변경하지 않았습니다.

## 필요한 외부 설정

1. [Google Auth Platform의 Branding/Audience](https://console.cloud.google.com/auth/audience)에서 동의 화면을 설정합니다. 개인 Gmail 계정으로 사용할 경우 **External**을 선택하고, 앱이 Testing 상태라면 Audience의 Test users에 `phlogos1@gmail.com`을 추가합니다. 코드는 `openid email profile` 기본 신원 범위만 요청하지만, 테스트 계정 목록에도 허용 이메일을 명시해 두는 편이 좋습니다.
2. [Google Auth Platform의 Clients](https://console.cloud.google.com/auth/clients)에서 **Create client → Web application**을 선택합니다.
   - **Authorized JavaScript origins:** `https://leftdrawer.github.io`
   - **Authorized redirect URIs:** `https://nfrubhmtyqvecckvzmxi.supabase.co/auth/v1/callback`
   - 생성 후 발급되는 **Client ID**와 **Client secret**이 필요합니다.
3. [Supabase Google provider 설정](https://supabase.com/dashboard/project/nfrubhmtyqvecckvzmxi/auth/providers)에서 Google 공급자를 켜고 Client ID와 Client secret을 입력합니다.
4. [Supabase URL Configuration](https://supabase.com/dashboard/project/nfrubhmtyqvecckvzmxi/auth/url-configuration)에서 다음 값을 등록합니다.
   - **Site URL:** `https://leftdrawer.github.io/calends_prep/`
   - **Redirect URLs 허용목록:** `https://leftdrawer.github.io/calends_prep/`
5. Google 공급자와 리다이렉트 설정을 마친 뒤 `supabase/migrations/20261115000000_google_account_auth.sql`을 운영 프로젝트에 적용합니다. 그 다음에만 앱을 배포하고 로그인·읽기·쓰기 검증을 진행합니다.

Google의 Client secret은 Supabase Auth 설정에만 입력해야 합니다. `app.js`, 공개 저장소, 웹페이지 코드나 채팅에 넣지 마세요. 클라이언트의 Supabase anon key는 공개용 식별자이지만, 실제 테이블 접근은 로그인 세션 토큰과 RLS 정책으로 제한됩니다.

## 현재 운영 상태와 주의점

- OAuth UI·PKCE 로그인 및 세션 토큰을 쓰는 코드와 allowlist RLS SQL은 준비되어 있습니다.
- 실제 Google Client ID/secret은 아직 발급·등록되지 않았고, Google/Supabase 대시보드의 URL 설정도 확인되지 않았습니다.
- 운영 DB의 `sangbogi`에는 현재 `anon`의 모든 테이블 권한과 `USING true`/`WITH CHECK true`인 공개 정책이 있습니다. 준비한 마이그레이션은 이를 제거하고 허용된 Google 계정만 `SELECT`, `INSERT`, `UPDATE`할 수 있게 바꾸지만, **아직 적용하지 않았습니다**. Google 로그인과 리다이렉트가 준비되기 전에 적용하면 현재 운영 앱의 데이터 접근이 끊길 수 있습니다.
- 앱 내부의 은호당·어머니·손님 선택은 화면 기능을 구분하는 기존 역할입니다. 서버 접근 허용은 이 선택값이 아니라 Google 계정 이메일과 Google 공급자를 RLS에서 확인합니다.
- 이전 가족 PIN 문자열은 공개 Git 이력에 남아 있을 수 있습니다. 현재 소스에서는 제거했지만, 공개 이력을 강제 재작성하지는 않았습니다.

## 공식 안내

- [Supabase: Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase: Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Google: OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google: Configure the OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent)
