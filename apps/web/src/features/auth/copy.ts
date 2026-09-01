import type { SupportedLocale } from '@sadat-real-estate/contracts';

export interface AuthCopy {
  readonly brand: string;
  readonly loginTitle: string;
  readonly loginDescription: string;
  readonly identifierLabel: string;
  readonly identifierPlaceholder: string;
  readonly passwordLabel: string;
  readonly passwordPlaceholder: string;
  readonly showPassword: string;
  readonly hidePassword: string;
  readonly rememberLabel?: string;
  readonly forgotPasswordAction?: string;
  readonly privacyNotice?: string;
  readonly loginAction: string;
  readonly loggingIn: string;
  readonly createAccountPrompt: string;
  readonly createAccountAction: string;
  readonly emailLoginPrompt: string;
  readonly emailLoginAction: string;
  readonly emailTitle: string;
  readonly emailDescription: string;
  readonly emailPlaceholder: string;
  readonly roleLabel: string;
  readonly roleSeeker: string;
  readonly roleProvider: string;
  readonly sendCodeAction: string;
  readonly sendingCode: string;
  readonly otpTitle: string;
  readonly otpDescription: string;
  readonly codeLabel: string;
  readonly codeDigitLabel: (position: number) => string;
  readonly verifyAction: string;
  readonly verifyingCode: string;
  readonly resendAction: string;
  readonly resendIn: (seconds: number) => string;
  readonly changeEmailAction: string;
  readonly codeSentTitle: string;
  readonly codeSentBody: string;
  readonly loginSuccessTitle: string;
  readonly loginSuccessBody: string;
  readonly verificationSuccessTitle: string;
  readonly verificationSuccessBody: string;
  readonly invalidFormTitle: string;
  readonly invalidFormBody: string;
  readonly invalidCredentialsTitle: string;
  readonly invalidCredentialsBody: string;
  readonly accountNotActiveTitle: string;
  readonly accountNotActiveBody: string;
  readonly invalidOtpTitle: string;
  readonly invalidOtpBody: string;
  readonly otpAttemptsTitle: string;
  readonly otpAttemptsBody: string;
  readonly otpRateLimitedTitle: string;
  readonly otpRateLimitedBody: string;
  readonly otpProviderTitle: string;
  readonly otpProviderBody: string;
  readonly networkTitle: string;
  readonly networkBody: string;
  readonly genericErrorTitle: string;
  readonly genericErrorBody: string;
  readonly unknownRouteTitle: string;
  readonly unknownRouteBody: string;
  readonly retryAction: string;
  readonly registrationPurpose: string;
  readonly registrationStepLabel?: string;
  readonly accountSelectionTitle: string;
  readonly accountSelectionBody: string;
  readonly seekerAccountTitle: string;
  readonly seekerAccountBody: string;
  readonly providerAccountTitle: string;
  readonly providerAccountBody: string;
  readonly continueAction: string;
  readonly backAction: string;
  readonly registrationFormTitle: string;
  readonly registrationFormBody: string;
  readonly firstNameLabel: string;
  readonly firstNamePlaceholder: string;
  readonly lastNameLabel: string;
  readonly lastNamePlaceholder: string;
  readonly registerAction: string;
  readonly registering: string;
  readonly registrationSuccessTitle: string;
  readonly registrationSuccessBody: string;
  readonly registrationNextAction: string;
  readonly invalidRegistrationTokenTitle: string;
  readonly invalidRegistrationTokenBody: string;
  readonly duplicateRegistrationTitle: string;
  readonly duplicateRegistrationBody: string;
  readonly registrationUnavailableTitle: string;
  readonly registrationUnavailableBody: string;
  readonly restartRegistrationAction: string;
}

const copies: Readonly<Record<SupportedLocale, AuthCopy>> = {
  ar: {
    brand: 'عقارات السادات',
    loginTitle: 'مرحباً لعودتك',
    loginDescription: 'سجل دخولك لمتابعة طلباتك وعقاراتك.',
    identifierLabel: 'البريد الإلكتروني',
    identifierPlaceholder: 'أدخل البريد الإلكتروني',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    showPassword: 'إظهار كلمة المرور',
    hidePassword: 'إخفاء كلمة المرور',
    rememberLabel: 'تذكرني',
    forgotPasswordAction: 'نسيت كلمة المرور؟',
    privacyNotice: 'نحافظ على خصوصية بياناتك ولا نشاركها دون إذنك.',
    loginAction: 'تسجيل الدخول',
    loggingIn: 'جارٍ تسجيل الدخول',
    createAccountPrompt: 'ليس لديك حساب؟',
    createAccountAction: 'إنشاء حساب',
    emailLoginPrompt: 'أو تابع برمز يُرسل إلى بريدك الإلكتروني',
    emailLoginAction: 'التحقق بالبريد',
    emailTitle: 'تأكيد البريد الإلكتروني',
    emailDescription: 'أدخل البريد الإلكتروني المرتبط بالحساب لإرسال رمز تحقق.',
    emailPlaceholder: 'أدخل البريد الإلكتروني',
    roleLabel: 'نوع الحساب',
    roleSeeker: 'باحث عن عقار',
    roleProvider: 'مقدم عقار',
    sendCodeAction: 'إرسال الرمز',
    sendingCode: 'جارٍ إرسال الرمز',
    otpTitle: 'أدخل رمز التحقق',
    otpDescription: 'أدخل الرمز المكوّن من ستة أرقام المرسل إلى البريد',
    codeLabel: 'رمز التحقق',
    codeDigitLabel: position => `رقم ${position} من رمز التحقق`,
    verifyAction: 'تأكيد الرمز',
    verifyingCode: 'جارٍ تأكيد الرمز',
    resendAction: 'إعادة إرسال الرمز',
    resendIn: seconds => `يمكنك إعادة الإرسال بعد ${seconds} ثانية`,
    changeEmailAction: 'تغيير البريد الإلكتروني',
    codeSentTitle: 'تم إرسال رمز التحقق',
    codeSentBody: 'تحقق من صندوق البريد والرسائل غير المرغوبة ثم أدخل الرمز للمتابعة.',
    loginSuccessTitle: 'تم تسجيل الدخول',
    loginSuccessBody: 'جارٍ نقلك إلى الصفحة المطلوبة.',
    verificationSuccessTitle: 'تم تأكيد البريد الإلكتروني',
    verificationSuccessBody: 'تم التحقق من بيانات الاتصال ويمكنك متابعة التسجيل.',
    invalidFormTitle: 'تحقق من البيانات',
    invalidFormBody: 'أكمل الحقول المطلوبة بالصيغة الصحيحة.',
    invalidCredentialsTitle: 'تعذر تسجيل الدخول',
    invalidCredentialsBody: 'بيانات الدخول غير صحيحة. راجعها وحاول مرة أخرى.',
    accountNotActiveTitle: 'الحساب غير متاح',
    accountNotActiveBody: 'لا يمكن تسجيل الدخول بهذا الحساب في الوقت الحالي.',
    invalidOtpTitle: 'رمز التحقق غير صحيح',
    invalidOtpBody: 'راجع الرمز وأدخله مرة أخرى.',
    otpAttemptsTitle: 'تم تجاوز محاولات التحقق',
    otpAttemptsBody: 'اطلب رمزًا جديدًا وحاول مرة أخرى.',
    otpRateLimitedTitle: 'تم إيقاف الإرسال مؤقتًا',
    otpRateLimitedBody: 'انتظر قليلًا قبل طلب رمز آخر.',
    otpProviderTitle: 'خدمة البريد غير متاحة',
    otpProviderBody: 'تعذر إرسال الرمز الآن. حاول مرة أخرى لاحقًا.',
    networkTitle: 'تعذر الاتصال',
    networkBody: 'تحقق من اتصالك وحاول مرة أخرى.',
    genericErrorTitle: 'تعذر إكمال العملية',
    genericErrorBody: 'حاول مرة أخرى. لم يتم عرض أي بيانات حساسة.',
    unknownRouteTitle: 'المسار غير متاح',
    unknownRouteBody: 'ارجع إلى صفحة تسجيل الدخول للمتابعة.',
    retryAction: 'إعادة المحاولة',
    registrationPurpose: 'التسجيل',
    registrationStepLabel: 'الخطوة 1',
    accountSelectionTitle: 'ما هدفك من استخدام عقارات السادات؟',
    accountSelectionBody: 'اختر نوع الاستخدام المناسب لك، ويمكنك استكمال بيانات حسابك في الخطوة التالية.',
    seekerAccountTitle: 'أبحث عن عقار',
    seekerAccountBody: 'استكشف الوحدات، احفظ العقارات المناسبة، وأرسل طلبات الاستفسار والمعاينة.',
    providerAccountTitle: 'أريد عرض عقارات',
    providerAccountBody: 'أضف وحداتك وتابع طلبات العملاء بعد مراجعة واعتماد حسابك.',
    continueAction: 'متابعة',
    backAction: 'العودة إلى تسجيل الدخول',
    registrationFormTitle: 'إنشاء حساب الباحث عن عقار',
    registrationFormBody: 'أكمل بياناتك الأساسية بعد تأكيد البريد الإلكتروني.',
    firstNameLabel: 'الاسم الأول',
    firstNamePlaceholder: 'أدخل الاسم الأول',
    lastNameLabel: 'اسم العائلة',
    lastNamePlaceholder: 'أدخل اسم العائلة',
    registerAction: 'إنشاء الحساب',
    registering: 'جارٍ إنشاء الحساب',
    registrationSuccessTitle: 'تم إنشاء حسابك',
    registrationSuccessBody: 'أصبح حساب الباحث عن عقار جاهزًا. يمكنك المتابعة إلى حسابك.',
    registrationNextAction: 'الانتقال إلى حسابي',
    invalidRegistrationTokenTitle: 'انتهت صلاحية التحقق',
    invalidRegistrationTokenBody: 'ابدأ التحقق من البريد الإلكتروني مرة أخرى للمتابعة بأمان.',
    duplicateRegistrationTitle: 'الحساب موجود بالفعل',
    duplicateRegistrationBody: 'يوجد حساب مرتبط بهذا البريد. ارجع إلى تسجيل الدخول للمتابعة.',
    registrationUnavailableTitle: 'لا يمكن متابعة التسجيل',
    registrationUnavailableBody: 'ابدأ التسجيل من جديد. لم يتم الاحتفاظ ببيانات التحقق على هذا الجهاز.',
    restartRegistrationAction: 'بدء التسجيل من جديد'
  },
  en: {
    brand: 'Sadat Real Estate',
    loginTitle: 'Log in',
    loginDescription: 'Log in to continue with your property search and requests.',
    identifierLabel: 'Email',
    identifierPlaceholder: 'Enter your email',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    rememberLabel: 'Remember me',
    forgotPasswordAction: 'Forgot password?',
    privacyNotice: 'We protect your data and never share it without your consent.',
    loginAction: 'Log in',
    loggingIn: 'Logging in',
    createAccountPrompt: "Don't have an account?",
    createAccountAction: 'Create an account',
    emailLoginPrompt: 'Or continue with a code sent to your email',
    emailLoginAction: 'Verify by email',
    emailTitle: 'Verify your email',
    emailDescription: 'Enter the email linked to the account. The one-time code is sent by email.',
    emailPlaceholder: 'Enter your email',
    roleLabel: 'Account type',
    roleSeeker: 'Property seeker',
    roleProvider: 'Property provider',
    sendCodeAction: 'Send code',
    sendingCode: 'Sending code',
    otpTitle: 'Enter the verification code',
    otpDescription: 'Enter the six-digit code sent to the email',
    codeLabel: 'Verification code',
    codeDigitLabel: position => `Verification code digit ${position}`,
    verifyAction: 'Verify code',
    verifyingCode: 'Verifying code',
    resendAction: 'Resend code',
    resendIn: seconds => `You can resend the code in ${seconds} seconds`,
    changeEmailAction: 'Change email address',
    codeSentTitle: 'Verification code sent',
    codeSentBody: 'Check your inbox and spam folder, then enter the code to continue.',
    loginSuccessTitle: 'You are logged in',
    loginSuccessBody: 'Taking you to the requested page.',
    verificationSuccessTitle: 'Email verified',
    verificationSuccessBody: 'Your contact details are verified and you can continue registration.',
    invalidFormTitle: 'Check your details',
    invalidFormBody: 'Complete the required fields using the expected format.',
    invalidCredentialsTitle: 'Unable to log in',
    invalidCredentialsBody: 'The login details are not correct. Review them and try again.',
    accountNotActiveTitle: 'Account unavailable',
    accountNotActiveBody: 'This account cannot log in at this time.',
    invalidOtpTitle: 'Incorrect verification code',
    invalidOtpBody: 'Review the code and enter it again.',
    otpAttemptsTitle: 'Verification attempts exceeded',
    otpAttemptsBody: 'Request a new code and try again.',
    otpRateLimitedTitle: 'Sending is temporarily paused',
    otpRateLimitedBody: 'Wait a little before requesting another code.',
    otpProviderTitle: 'Email service unavailable',
    otpProviderBody: 'The code could not be sent right now. Try again later.',
    networkTitle: 'Connection unavailable',
    networkBody: 'Check your connection and try again.',
    genericErrorTitle: 'The action could not be completed',
    genericErrorBody: 'Try again. No sensitive data was displayed.',
    unknownRouteTitle: 'Route unavailable',
    unknownRouteBody: 'Return to the login page to continue.',
    retryAction: 'Try again',
    registrationPurpose: 'registration',
    registrationStepLabel: 'Step 1',
    accountSelectionTitle: 'How will you use Sadat Real Estate?',
    accountSelectionBody: 'Choose the use that fits you. You can complete your account details in the next step.',
    seekerAccountTitle: 'I am looking for a property',
    seekerAccountBody: 'Explore units, save suitable properties, and send inquiry and viewing requests.',
    providerAccountTitle: 'I want to list properties',
    providerAccountBody: 'Add your units and follow customer requests after your account is reviewed and approved.',
    continueAction: 'Continue',
    backAction: 'Back to log in',
    registrationFormTitle: 'Create your seeker account',
    registrationFormBody: 'Complete your basic details after verifying your email.',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Enter your first name',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Enter your last name',
    registerAction: 'Create account',
    registering: 'Creating account',
    registrationSuccessTitle: 'Your account is ready',
    registrationSuccessBody: 'Your seeker account was created. Continue to your account to get started.',
    registrationNextAction: 'Go to my account',
    invalidRegistrationTokenTitle: 'Verification expired',
    invalidRegistrationTokenBody: 'Start email verification again to continue safely.',
    duplicateRegistrationTitle: 'Account already exists',
    duplicateRegistrationBody: 'An account is already linked to this email. Return to log in.',
    registrationUnavailableTitle: 'Registration cannot continue',
    registrationUnavailableBody: 'Start registration again. Verification data is not kept on this device.',
    restartRegistrationAction: 'Restart registration'
  },};

export function getAuthCopy(locale: SupportedLocale): AuthCopy {
  return copies[locale];
}
