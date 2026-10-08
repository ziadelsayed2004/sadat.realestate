# Employee accounts and role access

The roles list and role detail now explain that a role is a permission group, not a login identity. The guidance is visible outside the role edit/create form and links to administrator accounts, account creation and the normal login page. Creation from an active role preserves its ID so the employee role is selected automatically. Account creation links require staff and role management permissions.

The operator creates a Standard Admin using the employee's name, email and chosen password, or assigns an existing administrator from the role detail. Public team entries do not grant access. The operator supplies the employee's credentials and login link; account creation does not automatically send an invitation. Conditional email OTP is described accurately: administration requires the extra step only when two-factor authentication is enabled in privacy/security settings.

After successful account creation, the form clears its password and displays the saved email returned by the API and a login link. Editing an input afterward cannot change the displayed identity of the account that was created. No password is displayed or included in the handoff.

Validation: 10 administrator/role Vitest checks, 24 Playwright checks across Arabic/English desktop/tablet/mobile, web TypeScript, ESLint on changed TypeScript files and production web build. Browser coverage follows the role-specific account-creation link, checks the role preselection, creates a fixture account, checks password clearing and the saved email/login link, and verifies existing assignment and View Only behavior. Tests do not create or notify real employees.

Production still requires the existing manual update after pulling main.
