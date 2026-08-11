# State Machines

## Provider Application

`draft → pending_review → needs_information → pending_review → approved | rejected`، ويمكن `approved → suspended` بإجراء إداري موثق.

## Project / Property

`draft → pending_review → needs_changes → pending_review → approved → published` أو `rejected`. من `published` يمكن `hidden` أو `archived`. تعديل المنشور ينشئ Revision ولا يستبدل النسخة العامة قبل الاعتماد.

## Request

الأساس: `new → contacted → follow_up → viewing → interested | negotiation → completed | closed`. كل نوع يملك transitions مسموحة؛ لا تُقبل قفزة غير معرفة.

## Ad Request

`draft → review → waiting_pricing → quote_sent → waiting_payment → scheduled → active → ended`، مع rejected/cancelled/expired حيث يلزم.

## Payment Proof

`uploaded → pending_review → approved | rejected`. Uploaded لا تعني دفعًا معتمدًا.

## Account

`draft/unverified → pending_review → needs_information → verified | rejected`، و`verified → restricted | suspended → verified` بإجراء مصرح.

## Commission Resolution

اختر بالترتيب: active exception → active account override → active default policy. خزّن policy/version/source/effectiveAt في snapshot عند الحدث التجاري المتفق عليه.
