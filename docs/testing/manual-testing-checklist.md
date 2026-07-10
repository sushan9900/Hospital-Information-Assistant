# Manual Testing Checklist — Hospital Information Assistant

This checklist provides a structured QA outline to manually test and verify the functionalities of the **Hospital Information Assistant** full-stack platform.

---

## 🔒 1. User Authentication & Profile Management

### Register Flow
- [ ] **Create New Patient Account**: Navigate to `/register`, fill in the form with a unique email, and verify clicking "Create Account" redirects you to `/login?registered=true` showing a green success banner.
- [ ] **Name Validation**: Try registering with a name shorter than 2 characters (should throw form/API validation errors).
- [ ] **Password Match Check**: Try registering with mismatched "Password" and "Confirm Password" fields (should display a warning banner).
- [ ] **Min Length Password Check**: Try registering with a password shorter than 8 characters (should display a warning).
- [ ] **Duplicate Email Check**: Try registering with an email that is already registered (should display a warning stating email is taken).

### Login & Session Lifecycle Flow
- [ ] **Successful Login**: Sign in with registered credentials. Verify it redirects you to the `/dashboard` and loads your profile.
- [ ] **Deactivated Account Block**: (Admin tests) Try signing in with a deactivated account. Verify the API throws a `401 Unauthorized` with a deactivation message.
- [ ] **JWT Interceptor Check**: Open Developer Console (`F12`), check network tab, click any protected request (e.g. `/appointments/my`). Verify `Authorization: Bearer <token>` is present in request headers.
- [ ] **Session Expiration Guard**: Wait for token expiration (or manually clear `token` from `localStorage`). Visit `/dashboard`. Verify you are redirected back to `/login?expired=true` showing a session expired warning.
- [ ] **Logout Flow**: Click the log out button. Verify local storage is cleared (`token` and `user` deleted) and you are redirected to `/login`.

### Profile Editing & Security Flow
- [ ] **Modify Profile Details**: Visit `/profile`, edit your name, click "Save Changes". Verify the green success banner shows and the top Navbar avatar/display name updates instantly.
- [ ] **Change Password**: In `/profile`, input your current password, type a new password (min 8 chars), and confirm it. Click "Change Password". Verify a success message shows and inputs reset.
- [ ] **Incorrect Current Password Check**: Try changing the password with an incorrect current password (should display a warning from the API).

---

## 📂 2. Directory Browsing (Doctors & Departments)

### Doctors Directory Page
- [ ] **Semantic Search Input**: Type a query in the search bar (e.g., "Jane" or "Cardiologist"). Click "Search". Verify the results filter to matching doctor profiles.
- [ ] **Department Dropdown Filter**: Select a department from the dropdown (e.g., "Cardiology"). Verify only doctors linked to that department are listed.
- [ ] **Pagination Controls**: Verify clicking page numbers loads different doctor cards, and Previous/Next buttons disable appropriately at boundaries.

### Departments Page
- [ ] **Search by Name**: Search for a department name (e.g., "Pediatrics"). Verify matching cards list.
- [ ] **Inspect Staff Doctors Modal**: Click "View Doctors" on a card. Verify a modal opens, calls `getDepartmentById`, and lists all doctors registered inside that department.

---

## 📅 3. Appointment Booking Lifecycle

### Patient Booking Flow
- [ ] **Schedule Checkup modal**: Go to `/doctors`, click "Book Timings". Verify a modal opens.
- [ ] **Historical Date Block**: Open the date picker. Verify you cannot select historical dates (dates before today are blocked).
- [ ] **Time Slot Picker**: Select a time slot, fill in a reason, and click "Schedule Booking". Verify a success toast shows.
- [ ] **Personal Log Timeline**: Visit `/appointments`. Verify the new booking is listed at the top with status `pending`.
- [ ] **Reschedule Booking**: On `/appointments`, click "Reschedule". Select a new date and time slot, click "Save Schedule". Verify the table updates.
- [ ] **Cancel Booking**: Click "Cancel" on a pending appointment, confirm in the dialog. Verify the status badge updates to `cancelled`.

### Admin Scheduling Flow
- [ ] **Confirm Booking**: Log in as an Admin. Go to `/dashboard` or `/appointments`. On a `pending` appointment, click "Confirm". Verify status changes to `confirmed`.
- [ ] **Complete Booking**: Click "Complete" on a `confirmed` appointment. Verify status changes to `completed` and action triggers are removed.
- [ ] **Hospital-Wide Filters**: Filter logs by "Doctor", "Patient User ID", or "Status". Verify the list filters accordingly.

---

## 💬 4. AI Conversational Chatbot

- [ ] **Empty State Welcome**: Visit `/chat` with no session active. Verify the welcome guide lists instructions.
- [ ] **Initialize New Session**: Click "New Chat" in the sidebar. Verify a new row is added and a chat viewport opens.
- [ ] **Send Message & Memory**: Type "Hello, I want to ask about cardiology services". Click Send. Verify your message is sent, a typing loading indicator bounces, and the AI returns a reply.
- [ ] **Rename Session Title**: Verify that the session title in the sidebar automatically updates from "New Conversation" to a summary of your first query.
- [ ] **Clear Session History**: Click the Trash icon on the active session row, confirm. Verify message bubbles clear, inputs reset, and stats update.

---

## 🛠️ 5. RAG Index Ingestion (Admin Panel)

- [ ] **Access Guard Check**: Log in as a Patient. Try visiting `/rag`. Verify you are blocked and redirected to the `/dashboard`.
- [ ] **Sync / Seed Collection**: Log in as Admin, visit `/rag`. Click "Sync / Seed Index". Verify a loading spinner rotates and a success toast returns the count of embedded documents.
- [ ] **Qdrant Stats Verify**: Verify the "Index Points Count" card updates to show the correct number of embedded points.
- [ ] **Test Semantic Search**: In the test search input, type "who is the cardiologist?". Select "Doctors Only", click "Test Search". Verify matches are returned with cosine similarity scores.
- [ ] **JSON Payload Inspector**: Expand the "View Payload Metadata" drawer on a test result. Verify the raw metadata matches your doctor's SQL database records.
- [ ] **Wipe Vector DB**: Click "Wipe Vector Database", confirm. Verify points count resets to 0 and test searches return empty states.
