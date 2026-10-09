import type { SupportedLocale } from '@sadat-real-estate/contracts';

const copy = {
  ar: {
    title: 'هتلاقي هنا إيه؟', refresh: 'تحديث الإشعارات',
    queuesTitle: 'عناصر تحتاج المراجعة',
    queuesBody: 'طلبات التواصل والمعاينة، والعقارات وطلبات الإعلانات وإثباتات الدفع والبلاغات الجديدة تظهر حسب صلاحياتك. افتح القسم ثم تفاصيل الطلب لاتخاذ الإجراء.',
    inboxTitle: 'رسائل حسابك الإداري',
    inboxBody: 'القائمة بتعرض الرسائل الموجّهة لحسابك فقط. إشعارات حساب مقدم العقار، زي تغيير العمولة، تظهر في حسابه هو.',
    readTitle: 'مقروء مش معناها تم القبول',
    readBody: 'فتح التفاصيل أو تحديد كمقروء يخفي علامة التنبيه. قبول الطلب أو رفضه يتم من تفاصيله. الطلب يفضل موجود في قسمه لحد ما تتخذ الإجراء.',
    emptyWithQueues: 'مفيش رسائل مباشرة لحسابك، لكن فيه عناصر تحتاج المراجعة فوق. افتح القسم المطلوب لمتابعتها.',
    emptyWithoutQueues: 'مفيش رسائل موجّهة لحسابك حاليًا. القائمة الفاضية مش دليل إن كل الطلبات اتقبلت؛ تقدر تراجع الطلبات من أقسامها أو تضغط «تحديث الإشعارات».'
  },
  en: {
    title: 'What appears here?', refresh: 'Refresh notifications',
    queuesTitle: 'Items needing review',
    queuesBody: 'New contact and viewing requests, property submissions, advertising requests, payment proofs and reports appear according to your permissions. Open the section, then the request details to take action.',
    inboxTitle: 'Messages for your admin account',
    inboxBody: 'The list shows messages addressed to your account only. Provider alerts, such as a commission change, appear in the provider account.',
    readTitle: 'Read does not mean approved',
    readBody: 'Opening details or marking as read clears the alert badge. Approve or reject a request from its details. The request remains in its section until you take action.',
    emptyWithQueues: 'There are no direct messages for your account, but review items appear above. Open their section to follow up.',
    emptyWithoutQueues: 'There are no messages addressed to your account right now. An empty inbox does not mean all requests are approved; review them in their sections or press Refresh notifications.'
  }
};

export function getNotificationHelpCopy(locale: SupportedLocale) { return copy[locale]; }

export function NotificationHelp({ locale }: { readonly locale: SupportedLocale }) {
  const text = getNotificationHelpCopy(locale);
  return <section className="admin-notifications-audit__help" aria-labelledby="admin-notifications-help-title">
    <h2 id="admin-notifications-help-title">{text.title}</h2>
    <div className="admin-notifications-audit__help-grid">
      <div><h3>{text.queuesTitle}</h3><p>{text.queuesBody}</p></div>
      <div><h3>{text.inboxTitle}</h3><p>{text.inboxBody}</p></div>
      <div><h3>{text.readTitle}</h3><p>{text.readBody}</p></div>
    </div>
  </section>;
}
