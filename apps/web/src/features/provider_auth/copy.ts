import type { ProviderType, SupportedLocale } from '@sadat-real-estate/contracts';

export interface ProviderTypeOptionCopy {
  readonly title: string;
  readonly description: string;
}

export interface ProviderTypeCopy {
  readonly title: string;
  readonly description: string;
  readonly optionsLabel: string;
  readonly continueAction: string;
  readonly backAction: string;
  readonly guidanceTitle: string;
  readonly guidanceBody: string;
  readonly options: Readonly<Record<ProviderType, ProviderTypeOptionCopy>>;
}

const copyByLocale: Readonly<Record<SupportedLocale, ProviderTypeCopy>> = {
  ar: {
    title: 'اختر نوع مقدم العقار',
    description: 'اختر النوع الذي يصف نشاطك العقاري للمتابعة إلى الحقول المناسبة.',
    optionsLabel: 'أنواع مقدمي العقارات المتاحة',
    continueAction: 'متابعة',
    backAction: 'العودة إلى اختيار الحساب',
    guidanceTitle: 'اختيارك يحدد الخطوة التالية',
    guidanceBody: 'سنطلب في الخطوة التالية البيانات والوثائق المناسبة لنوع مقدم العقار الذي اخترته. تخضع الطلبات للمراجعة الإدارية قبل الموافقة.',
    options: {
      individual_broker: {
        title: 'وسيط عقاري فردي',
        description: 'للمهني العقاري الذي يعمل بصفته الفردية.'
      },
      brokerage_office: {
        title: 'مكتب وساطة عقارية',
        description: 'لمكتب الوساطة الذي يمثل نشاطًا تجاريًا.'
      },
      developer_company: {
        title: 'شركة مطورة',
        description: 'للشركة التي تطور وتدير مشروعات عقارية.'
      }
    }
  },
  en: {
    title: 'Choose your provider type',
    description: 'Select the type that describes your real-estate activity to continue to the right fields.',
    optionsLabel: 'Available provider types',
    continueAction: 'Continue',
    backAction: 'Back to account selection',
    guidanceTitle: 'Your choice sets the next step',
    guidanceBody: 'The next step will request the fields and documents for the provider type you choose. Applications are subject to administrative review before approval.',
    options: {
      individual_broker: {
        title: 'Individual broker',
        description: 'For a real-estate professional operating as an individual.'
      },
      brokerage_office: {
        title: 'Brokerage office',
        description: 'For a brokerage office representing a business activity.'
      },
      developer_company: {
        title: 'Developer company',
        description: 'For a company that develops and manages real-estate projects.'
      }
    }
  },};

export function getProviderTypeCopy(locale: SupportedLocale): ProviderTypeCopy {
  return copyByLocale[locale];
}
