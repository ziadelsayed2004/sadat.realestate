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
  readonly phoneLoginPrompt: string;
  readonly phoneLoginAction: string;
  readonly phoneTitle: string;
  readonly phoneDescription: string;
  readonly phoneLabel: string;
  readonly phonePlaceholder: string;
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
  readonly changePhoneAction: string;
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
  readonly verifiedPhoneLabel: string;
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
    phoneLoginPrompt: 'أو تابع برقم الهاتف ورمز يُرسل إلى بريدك',
    phoneLoginAction: 'التحقق بالبريد',
    phoneTitle: 'تأكيد الهاتف والبريد الإلكتروني',
    phoneDescription: 'أدخل رقم الهاتف والبريد المرتبط بالحساب لإرسال رمز تحقق إلى البريد.',
    phoneLabel: 'رقم الهاتف',
    phonePlaceholder: '+20 100 000 0000',
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
    changePhoneAction: 'تغيير رقم الهاتف',
    codeSentTitle: 'تم إرسال رمز التحقق',
    codeSentBody: 'تحقق من صندوق البريد والرسائل غير المرغوبة ثم أدخل الرمز للمتابعة.',
    loginSuccessTitle: 'تم تسجيل الدخول',
    loginSuccessBody: 'جارٍ نقلك إلى الصفحة المطلوبة.',
    verificationSuccessTitle: 'تم تأكيد البريد والهاتف',
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
    registrationFormBody: 'أكمل بياناتك الأساسية بعد تأكيد الهاتف والبريد الإلكتروني.',
    firstNameLabel: 'الاسم الأول',
    firstNamePlaceholder: 'أدخل الاسم الأول',
    lastNameLabel: 'اسم العائلة',
    lastNamePlaceholder: 'أدخل اسم العائلة',
    verifiedPhoneLabel: 'رقم الهاتف المؤكد',
    registerAction: 'إنشاء الحساب',
    registering: 'جارٍ إنشاء الحساب',
    registrationSuccessTitle: 'تم إنشاء حسابك',
    registrationSuccessBody: 'أصبح حساب الباحث عن عقار جاهزًا. يمكنك المتابعة إلى حسابك.',
    registrationNextAction: 'الانتقال إلى حسابي',
    invalidRegistrationTokenTitle: 'انتهت صلاحية التحقق',
    invalidRegistrationTokenBody: 'ابدأ التحقق من الهاتف والبريد مرة أخرى للمتابعة بأمان.',
    duplicateRegistrationTitle: 'الحساب موجود بالفعل',
    duplicateRegistrationBody: 'يوجد حساب مرتبط بهذا الهاتف أو البريد. ارجع إلى تسجيل الدخول للمتابعة.',
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
    phoneLoginPrompt: 'Or continue with your phone and an email code',
    phoneLoginAction: 'Verify by email',
    phoneTitle: 'Verify your phone and email',
    phoneDescription: 'Enter the phone number and email linked to the account. The one-time code is sent by email.',
    phoneLabel: 'Phone number',
    phonePlaceholder: '+20 100 000 0000',
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
    changePhoneAction: 'Change phone number',
    codeSentTitle: 'Verification code sent',
    codeSentBody: 'Check your inbox and spam folder, then enter the code to continue.',
    loginSuccessTitle: 'You are logged in',
    loginSuccessBody: 'Taking you to the requested page.',
    verificationSuccessTitle: 'Email and phone verified',
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
    registrationFormBody: 'Complete your basic details after verifying your phone and email.',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Enter your first name',
    lastNameLabel: 'Last name',
    lastNamePlaceholder: 'Enter your last name',
    verifiedPhoneLabel: 'Verified phone number',
    registerAction: 'Create account',
    registering: 'Creating account',
    registrationSuccessTitle: 'Your account is ready',
    registrationSuccessBody: 'Your seeker account was created. Continue to your account to get started.',
    registrationNextAction: 'Go to my account',
    invalidRegistrationTokenTitle: 'Verification expired',
    invalidRegistrationTokenBody: 'Start phone and email verification again to continue safely.',
    duplicateRegistrationTitle: 'Account already exists',
    duplicateRegistrationBody: 'An account is already linked to this phone or email. Return to log in.',
    registrationUnavailableTitle: 'Registration cannot continue',
    registrationUnavailableBody: 'Start registration again. Verification data is not kept on this device.',
    restartRegistrationAction: 'Restart registration'
  },
  'zh-CN': {
    brand: '萨达特房地产',
    loginTitle: '登录',
    loginDescription: '登录后继续查看您的房产搜索和请求。',
    identifierLabel: '电子邮箱',
    identifierPlaceholder: '请输入电子邮箱',
    passwordLabel: '密码',
    passwordPlaceholder: '请输入密码',
    showPassword: '显示密码',
    hidePassword: '隐藏密码',
    loginAction: '登录',
    loggingIn: '正在登录',
    createAccountPrompt: '还没有账号？',
    createAccountAction: '创建账号',
    phoneLoginPrompt: '或使用手机号和邮件验证码继续',
    phoneLoginAction: '通过邮件验证',
    phoneTitle: '验证手机号和邮箱',
    phoneDescription: '请输入账号关联的手机号和邮箱，一次性验证码将通过邮件发送。',
    phoneLabel: '手机号',
    phonePlaceholder: '+20 100 000 0000',
    roleLabel: '账号类型',
    roleSeeker: '购房者',
    roleProvider: '房产提供方',
    sendCodeAction: '发送验证码',
    sendingCode: '正在发送验证码',
    otpTitle: '输入验证码',
    otpDescription: '请输入发送至以下邮箱的六位验证码：',
    codeLabel: '验证码',
    codeDigitLabel: position => `验证码第 ${position} 位`,
    verifyAction: '验证验证码',
    verifyingCode: '正在验证验证码',
    resendAction: '重新发送验证码',
    resendIn: seconds => `${seconds} 秒后可以重新发送`,
    changePhoneAction: '更换手机号',
    codeSentTitle: '验证码已发送',
    codeSentBody: '请查看收件箱和垃圾邮件，然后输入验证码继续。',
    loginSuccessTitle: '登录成功',
    loginSuccessBody: '正在前往请求的页面。',
    verificationSuccessTitle: '邮箱和手机号已验证',
    verificationSuccessBody: '联系信息验证成功，可以继续注册。',
    invalidFormTitle: '请检查信息',
    invalidFormBody: '请按要求完成必填字段。',
    invalidCredentialsTitle: '无法登录',
    invalidCredentialsBody: '登录信息不正确，请检查后重试。',
    accountNotActiveTitle: '账号不可用',
    accountNotActiveBody: '此账号目前无法登录。',
    invalidOtpTitle: '验证码不正确',
    invalidOtpBody: '请检查验证码后重新输入。',
    otpAttemptsTitle: '验证次数已超限',
    otpAttemptsBody: '请申请新的验证码后重试。',
    otpRateLimitedTitle: '发送暂时暂停',
    otpRateLimitedBody: '请稍等片刻再申请新的验证码。',
    otpProviderTitle: '邮件服务不可用',
    otpProviderBody: '当前无法发送验证码，请稍后重试。',
    networkTitle: '连接不可用',
    networkBody: '请检查网络连接后重试。',
    genericErrorTitle: '操作无法完成',
    genericErrorBody: '请重试。页面不会显示敏感信息。',
    unknownRouteTitle: '路径不可用',
    unknownRouteBody: '返回登录页面继续。',
    retryAction: '重试',
    registrationPurpose: '注册',
    accountSelectionTitle: '创建您的账号',
    accountSelectionBody: '请选择与您使用平台方式相符的账号类型。',
    seekerAccountTitle: '购房者',
    seekerAccountBody: '搜索房产并在账号中跟进您的请求。',
    providerAccountTitle: '房产提供方',
    providerAccountBody: '发布房产并开始提供方申请。',
    continueAction: '继续',
    backAction: '返回',
    registrationFormTitle: '创建购房者账号',
    registrationFormBody: '验证手机号和邮箱后，完成您的基本信息。',
    firstNameLabel: '名字',
    firstNamePlaceholder: '请输入名字',
    lastNameLabel: '姓氏',
    lastNamePlaceholder: '请输入姓氏',
    verifiedPhoneLabel: '已验证手机号',
    registerAction: '创建账号',
    registering: '正在创建账号',
    registrationSuccessTitle: '账号已准备就绪',
    registrationSuccessBody: '您的购房者账号已创建。继续进入账号开始使用。',
    registrationNextAction: '进入我的账号',
    invalidRegistrationTokenTitle: '验证已过期',
    invalidRegistrationTokenBody: '请重新验证手机号和邮箱后安全继续。',
    duplicateRegistrationTitle: '账号已存在',
    duplicateRegistrationBody: '此手机号或邮箱已关联账号。返回登录页面继续。',
    registrationUnavailableTitle: '无法继续注册',
    registrationUnavailableBody: '请重新开始注册。此设备不会保留验证数据。',
    restartRegistrationAction: '重新开始注册'
  }
};

export function getAuthCopy(locale: SupportedLocale): AuthCopy {
  return copies[locale];
}
