# Property editing and photo management

The public `/properties?lang=ar` listing now offers **Edit property and photos** to administrative sessions. The link opens the selected property directly, including records outside the first list page. The editor itself requires `admin:properties.manage` and keeps the property's owner and publication state intact.

Administrators can edit bilingual titles and descriptions, price, sale/rent type, area and room/floor counts. Each save includes the current property version and an administrative reason. Failed saves retain entered values; conflicting versions require reloading.

Photo management supports JPG/PNG uploads up to 10 MB, authenticated previews of unpublished photos, cover selection and removal. Media writes retain malware scanning, ownership checks, capacity limits and transactional audit records. The public cover follows ready active media; deleting the cover selects a remaining image, and deleting the last uploaded image clears its generated URL. Legacy direct images can also be removed. Public cards no longer restore a synthetic photo when the real image is absent.

Validation:

- 50 web unit tests across editor, listing, homepage and existing administrative property views.
- 42 API tests covering property and media permissions, published administrative edits, strict write contracts, conflicts and protected photo streaming.
- Browser upload, cover change and deletion flow in Arabic/English on desktop, tablet and mobile (six projects).
- Real MongoDB checks for cover synchronization, stale writes, administrative audit, rollback, deletion and public/private preview boundaries.
- Web/API type checks, changed-file lint, web production build, route inventory and OpenAPI/Postman validation.

Code is delivered through `main`. Production still requires the existing release command:

```bash
cd /root/sadat-release
git pull --ff-only origin main
bash deploy/native/manage-production.sh update
```
