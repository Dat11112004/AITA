# WEB-A-05 — Class Management (Create Class Under Subject)

## Status

- **Feature ID:** WEB-A-05
- **Status:** 🟡 Partial (~60%)
- **Difficulty:** Medium
- **Estimate:** 5 Story Points
- **Dependency:** FABLE-06 (Enrollment Persistence)

---

# Objective

Implement the ability to create a **Class** that belongs to a real **Subject** entity.

Example:

```text
Subject: PRO192
 ├── SE18A01
 ├── SE18C01
 └── SE19A02

Subject: PRJ301
 ├── SE18B01
 └── SE18D01
```

Currently the frontend only stores a text value for subject, therefore classes are **not actually linked** to a Subject entity.

After this feature, every Class must reference a real Subject record in database.

---

# Current Implementation

## Frontend

`FE/src/pages/admin/AdminClasses.tsx`

Current create form contains:

- code
- name
- subject (TEXT INPUT ❌)
- semester
- campus
- instructor

Problem: User types a subject name as plain text, so no relationship is created with the Subject table.

## Backend

`be/src/modules/classes/application/create-class.use-case.ts`

Already does:

- validate subject exists
- assign instructor

Related issue:

`be/src/modules/classes/application/enroll-student.use-case.ts`

Enrollment still uses an in-memory repository. Persistence will be implemented in **FABLE-06**.

---

# Tasks

## Frontend

- Replace Subject text input with a dropdown.
- Load subjects using `api.getSubjects()`.
- Submit `subjectId` instead of `subject`.

## Backend

- Validate `subjectId`.
- Persist `subjectId` when creating a class.
- Reject invalid or missing `subjectId`.

---

# Acceptance Criteria

- Subject must be selected from a dropdown.
- Dropdown loads real Subject entities.
- Class stores `subjectId`.
- Class appears under the correct Subject after creation.
- Compatible with FABLE-06 enrollment persistence.

---

# Build Verification

```bash
cd be
npm run build

cd ../FE
npm run build
```

---

# PR Title

```
[WEB-A-05] Implement subject-linked class creation
```
