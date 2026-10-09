# Team departments and layout — 2026-10-09

Reworked the team department manager into a bounded, responsive card with a clear department selector, grouped fields, normal checkbox sizing, a full-width reason field and visible save feedback. Labels now consistently call these departments. The member form's existing Team department field saves the selected department through the existing CMS API.

Public team cards now show the localized department name separately from the job title and support the existing department filters, including newly created departments. Card bodies grow with their content so the department, member name, job title and biography are not clipped. Department filters wrap on smaller screens.

Team membership and department assignment do not create administrative login accounts or grant permissions. Failed saves retain entered values and existing department version handling remains intact.

Validation on an isolated staged release:

- 42 CMS, team and department unit checks passed.
- 6 browser projects passed across Arabic/English desktop, tablet and mobile. The workflow creates a department, assigns it to a member, saves and reopens the member, then verifies the public department badge, job title, filters, photo sizing and absence of clipping or horizontal overflow.
- Web TypeScript, ESLint and production build passed.
- Arabic desktop/mobile department forms and the public team card were inspected visually.

Production update remains manual after pulling main:

```bash
cd /root/sadat-release
git pull --ff-only origin main
bash deploy/native/manage-production.sh update
```
