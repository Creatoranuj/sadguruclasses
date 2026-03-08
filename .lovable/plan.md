
## Admin Panel — Poora Map

User pooch raha hai "admin panel me kya hai" — yeh ek informational/audit question hai, koi code change nahi chahiye. Full admin panel structure present karta hoon.

### Admin Pages (Routes)
- `/admin` → Main Admin Dashboard (Admin.tsx — 1946 lines)
- `/admin/upload` → AdminUpload.tsx
- `/admin/cms` → AdminCMS.tsx  
- `/admin/schedule` → AdminSchedule.tsx
- `/admin/quiz` → AdminQuizManager.tsx
- `/admin/live` → AdminLiveManager.tsx
- `/admin/chatbot` → AdminChatbotSettings.tsx

### Main Admin Dashboard (/admin) — 12 Tabs

**Tab 1: Payments**
- UPI Manual + Razorpay — unified list
- Approve / Reject manual payments
- View payment screenshot (signed URL)
- Revenue stats (Manual + Razorpay split)
- CSV Export

**Tab 2: Users**
- All registered users list
- Search by name/email/phone
- Filter by role (Student/Teacher/Admin)
- Change role inline (dropdown)
- CSV Export

**Tab 3: Teachers**
- Active teachers list
- Promote student → Teacher
- Revoke teacher → Student

**Tab 4: Courses**
- Create new course (title, description, price, grade, thumbnail)
- Edit course inline
- Delete course
- Search + Export

**Tab 5: Content (Drill-down)**
- Course → Chapter → Lessons tree
- Navigate to upload from within content tree

**Tab 6: Upload**
- Upload Lecture/PDF/DPP/Notes/Test
- Link paste OR file upload
- YouTube live preview
- Course + Chapter selection

**Tab 7: Schedule** (links to /admin/schedule)
- Lecture schedule management

**Tab 8: Library**
- Materials CRUD (PDF, Notes, DPP)
- Notes CRUD
- Filter by type and course

**Tab 9: Social**
- Social links manager

**Tab 10: Live** 
- Live sessions management

**Tab 11: Banners**
- Hero banner CRUD

**Tab 12: Doubts**
- Doubt sessions management

### Separate Admin Pages

**AdminQuizManager (/admin/quiz)**
- Create DPP / Test quizzes
- Add MCQ / True-False / Numerical questions
- Drag-and-drop question reorder (dnd-kit)
- Image upload per question
- Publish/Unpublish quiz
- Student attempt count view

**AdminChatbotSettings (/admin/chatbot)**
- System prompt editor
- Provider/Model selection (Gemini)
- Temperature, max tokens settings
- FAQ management (create/edit/delete)
- Knowledge Base management
- Chat logs viewer

**AdminLiveManager (/admin/live)**
- Create/manage live sessions
- Zoom meeting creation

**AdminSchedule (/admin/schedule)**
- Lecture schedule calendar

**AdminCMS (/admin/cms)**
- Landing page content management

**AdminUpload (/admin/upload)**
- Dedicated upload page (separate from main admin)

### Stats Dashboard (Top Cards)
- Total Students
- Total Revenue (₹)
- Total Courses
- Pending Payments (clickable → Payments tab)
- Active Enrollments

No code changes needed — this is purely an information audit response. No plan to present, just a comprehensive structured summary.
