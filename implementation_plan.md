# Infrastructure Migration and Email Implementation Plan

This plan details the process of migrating the local database to the cloud, hosting the backend, implementing password reset functionality via Brevo, preparing the app for testing via EAS, and making architectural notes for a future AWS DynamoDB migration.

## User Review Required
> [!IMPORTANT]
> - **Backend Hosting:** Which platform do you prefer for hosting the Node.js backend (e.g., Render, Railway, Vercel, Heroku, DigitalOcean)?
> - **Brevo:** Do you already have a Brevo account and API key? If yes, please provide it securely (or add it to your [.env](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/server/.env) later).
> - **EAS Account:** Do you currently have an Expo account created for the EAS builds?

## Proposed Changes

### Phase 1: MongoDB Atlas Migration
- Migrate the local database `glitch_db` to a MongoDB Atlas cluster using `mongodump` and `mongorestore`.
- Update `MONGO_URI` in the backend [.env](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/server/.env) file to the Atlas connection string.

### Phase 2: Backend Hosting
- Add necessary production start scripts to [server/package.json](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/server/package.json).
- Deploy the backend application.
- Update [constants/config.ts](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/constants/config.ts) in the frontend to switch from the local IP (`http://192.168.3.101:5000/api`) to the new live backend URL.

### Phase 3: Brevo Email Integration (Password Reset)
#### [NEW] `server/services/emailService.js`
- Create a service to connect to Brevo via Nodemailer or the official SDK.

#### [MODIFY] `server/controllers/authController.js` (or similar location)
- Add or update the `forgotPassword` logic to generate a reset token, store it temporarily (or in the DB), and send an email using Brevo.
- Add or update the `resetPassword` logic to verify the token and update the user's password.

#### [MODIFY] [server/routes/authRoutes.js](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/server/routes/authRoutes.js)
- Expose the `/forgot-password` and `/reset-password` endpoints.

#### [MODIFY] [app/(auth)/forgotPassword.tsx](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/app/%28auth%29/forgotPassword.tsx)
- Integrate backend API calls using [lib/api.ts](file:///c:/Users/AKUMAH98/Desktop/glitch%202.0/glitch2.0/Glitch/lib/api.ts) to trigger password reset emails and verify user entries.

### Phase 4: Expo EAS Builds
#### [NEW] `eas.json`
- Initialize standard build profiles for `development`, `preview`, and `production`.
- Configure the build process to output `.apk` test files for Android so they can be easily installed directly on physical devices without going through the Play Store initially.

### Phase 5: Future AI & DynamoDB Strategy
- Later in the future, the backend data models will be reorganized from Mongoose schemas to AWS DynamoDB single-table or multi-table designs.
- Ensure the backend repository uses clean service injection patterns, making replacing MongoDB models with DynamoDB controllers easier when the time comes.

## Verification Plan
### Automated Tests
- Test endpoints utilizing Postman/cURL for the new `/forgot-password` flow.
- Ensure `API_URL` uses the correct hosted backend locally or on devices.

### Manual Verification
- Ask the user to click the reset link in the Brevo email and verify functionality.
- Install the EAS-generated `.apk` build on an Android device to confirm connectivity to the newly hosted database and backend.
