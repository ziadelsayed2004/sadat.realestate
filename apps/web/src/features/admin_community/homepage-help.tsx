import type { SupportedLocale } from '@sadat-real-estate/contracts';

export function CommunityHomepageHelp({ locale }: { locale: SupportedLocale }) {
  return <aside className="admin-community__panel" style={{ padding: 16, marginBlock: 16 }}><h2>{locale === 'ar' ? 'إضافة آراء وتجارب السكان للرئيسية' : 'Add residents’ posts to the homepage'}</h2><ol>
    <li>{locale === 'ar' ? 'من حساب صاحب المشاركة، افتح المجتمع واكتب عنوان التجربة أو السؤال ونصه، ثم أرسل المشاركة للمراجعة.' : 'From the author’s account, open the community, write a title and the experience or question, then submit it for review.'}</li>
    <li>{locale === 'ar' ? 'من هذه الصفحة، افتح مراجعة المنشور، واختر «نشر» واكتب سبب المراجعة ثم احفظ.' : 'On this page, review the post, choose Publish, enter the review reason and save.'}</li>
    <li>{locale === 'ar' ? 'تظهر أحدث ٣ مشاركات منشورة تلقائيًا في «آراء وتجارب السكان» باسم صاحبها. إخفاء المنشور يزيله من الرئيسية أيضًا.' : 'The latest three published posts appear automatically in residents’ experiences under their authors’ names. Hiding a post removes it from the homepage too.'}</li>
  </ol><a href={`/community?create=1&lang=${locale}`} target="_blank" rel="noreferrer">{locale === 'ar' ? 'فتح كتابة منشور في المجتمع' : 'Open the community composer'}</a></aside>;
}
