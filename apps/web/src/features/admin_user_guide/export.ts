import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { GuideSection } from './content.ts';

export const GUIDE_EDITION = '2026-10-08';

/** Markdown uses the same filtered topics as the on-screen operating guide. */
export function guideAsMarkdown(sections: readonly GuideSection[], locale: SupportedLocale = 'ar'): string {
  const lines = ['# دليل استخدام منصة عقارات السادات', '', `آخر تحديث: ${GUIDE_EDITION}`, '', 'الشرح باللغة العربية. الروابط تتبع لغة الواجهة؛ فتح الرابط لا يمنح صلاحية جديدة.', ''];
  for (const section of sections) {
    lines.push(`## ${section.title}`, '', section.description, '');
    for (const topic of section.topics) {
      lines.push(`### ${topic.title}`, '', topic.summary, '', `**قبل أن تبدأ:** ${topic.before}`, '', '#### الخطوات', '');
      topic.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
      lines.push('', '#### شرح الحقول والمعاني', '');
      topic.fields.forEach(([name, explanation]) => lines.push(`- **${name}:** ${explanation}`));
      lines.push('', `**النتيجة المتوقعة:** ${topic.result}`, '', '#### أسئلة وحلول', '');
      topic.questions.forEach(([question, answer]) => lines.push(`**${question}**`, '', answer, ''));
      if (topic.limitation) lines.push(`**حدود الوظيفة الحالية:** ${topic.limitation}`, '');
      lines.push('#### افتح صفحة المهمة', '');
      topic.links.forEach(link => {
        const url = new URL(link.path, 'https://elsadatrealestate.com');
        url.searchParams.set('lang', locale);
        lines.push(`- [${link.label}](${url.href})`);
      });
      lines.push('');
    }
  }
  return `${lines.join('\n')}\n`;
}

export function guideAsText(sections: readonly GuideSection[], locale: SupportedLocale = 'ar'): string {
  const lines = [`دليل استخدام منصة عقارات السادات — ${GUIDE_EDITION}`, 'الشرح عربي. الروابط تتبع لغة الواجهة؛ فتح الرابط لا يمنح صلاحية جديدة.', ''];
  for (const section of sections) {
    lines.push(`=== ${section.title} ===`, section.description, '');
    for (const topic of section.topics) {
      lines.push(topic.title, topic.summary, `قبل أن تبدأ: ${topic.before}`, 'الخطوات:');
      topic.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
      lines.push('شرح الحقول:');
      topic.fields.forEach(([name, explanation]) => lines.push(`- ${name}: ${explanation}`));
      lines.push(`النتيجة: ${topic.result}`, 'أسئلة وحلول:');
      topic.questions.forEach(([question, answer]) => lines.push(`- ${question}\n  ${answer}`));
      if (topic.limitation) lines.push(`حدود الوظيفة الحالية: ${topic.limitation}`);
      lines.push('الروابط:');
      topic.links.forEach(link => {
        const url = new URL(link.path, 'https://elsadatrealestate.com');
        url.searchParams.set('lang', locale);
        lines.push(`${link.label}: ${url.href}`);
      });
      lines.push('');
    }
  }
  return lines.join('\n');
}
