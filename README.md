# ER-API

> 이터널 리턴 전적 검색 사이트

### [방문🔗](https://er-profile.vercel.app/)

## 프로젝트 설명
배틀로얄 게임 [이터널리턴🔗](https://playeternalreturn.com/main?hl=ko-KR)의 공식 api를 활용한 전적 검색 사이트의 API 프로젝트입니다.

각 시즌별, 모드별 간단한 데이터를 조회할수 있으며 최근 90일의 상세한 경기 정보를 제공합니다.

[ER-Profile](https://github.com/JH-YUN/er-profile) 프로젝트와 통신하여 작동합니다.

## ENV 설정
```bash
# 이터널 리턴 공식 API 주소
ER_API_URL=https://open-api.bser.io
# 이터널 리턴 공식 API KEY
ER_API_KEY=[YOUR_API_KEY]

# firestore 설정
FIREBASE_PROJECT_ID=[YOUR_FIREBASE_PROJECT_ID]
FIREBASE_PRIVATE_KEY_ID=[YOUR_FIREBASE_PROJECT_KEY_ID]
FIREBASE_PRIVATE_KEY=[YOUR_FIREBASE_PROJECT_PRIVATE_ID]
FIREBASE_CLIENT_EMAIL=[YOUR_FIREBASE_CLIENT_EMAIL]
FIREBASE_CLIENT_ID=[YOUR_FIREBASE_CLIENT_ID]

```
## 사용 기술
- NestJS
- TypeScript
- Google Cloud Firestore
## 배포환경
- Google Cloud Run
- Google Cloud Scheduler