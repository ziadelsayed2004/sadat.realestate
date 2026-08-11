# Environment Matrix

| Environment | Database | Storage | Providers | Data |
|---|---|---|---|---|
| local | Mongo replica set محلي | local adapter | fake adapters | synthetic only |
| test | ephemeral replica set | in-memory/temp | deterministic fakes | fixtures |
| preview/UAT | isolated replica set | non-prod bucket | sandbox providers | UAT synthetic |
| production | managed/self-managed replica set موثوق | private/public production storage | live approved providers | real |

Node baseline وقت إنشاء الخطة: v24 LTS. لا تستخدم v26 Current للإنتاج إلا بقرار توافق جديد. ثبّت lockfile ولا تستخدم `latest` في CI.
