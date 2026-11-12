# تقرير مراجعة الأمان والأداء — AmazinReview

> **تقرير تاريخي قبل الإصلاحات.** بناءً على طلب المستخدم اللاحق نُفذت إصلاحات محلية؛ راجع [تقرير الإصلاحات والتسليم بتاريخ 10 نوفمبر](./SECURITY_PERFORMANCE_REMEDIATION_2026-11-10.md). لم تُنشر التغييرات على الإنتاج.

**التاريخ:** 9 نوفمبر 2026 — Africa/Cairo  
**الموقع:** https://www.amazinreview.com/  
**المشروع:** `D:\Zyrra\funnelflow`  
**Git commit:** `ec0b54083bd350a80f9064be9b51d73c6f86eec4`  
**طريقة العمل:** مراجعة بدون إصلاح أو تعديل كود التطبيق، واختبارات استغلال محلية معزولة، وفحص حي محدود للقراءة فقط. كان هذا التقرير الملف الوحيد المضاف داخل المشروع في مرحلة الفحص الأولى.

## 1. الحكم التنفيذي

**لا يمكن اعتبار المشروع آمنًا بحالته الحالية أو تأكيد عدم إمكانية الوصول إلى بيانات حساسة.** توجد عيوب واضحة في صلاحيات قاعدة البيانات، وربط بيانات حساب ببيانات حساب آخر، والتحقق من الطلبات، وصرف المكافآت، وتفعيل الاشتراكات. بعضها أُعيد إنتاجه بتنفيذ دوال التطبيق الحقيقية مع بدائل وهمية لقاعدة البيانات وStripe والبريد؛ لم تُنفذ عمليات تغيير على الإنتاج.

الفحص الحي نجح في تأكيد رفض الوصول غير المسجل إلى أربع APIs أساسية، وعدم كشف ملفات `.env` و`.git/config` في المسارات المختبرة. لكنه أكد أيضًا إمكانية قراءة سجلات `campaigns` و`campaign_products` مباشرة بمفتاح الزائر العام. هذا ليس دليلًا على أن بيانات العملاء كلها مكشوفة، لكنه يثبت أن حماية واجهة الموقع وحدها لا تكفي.

أهم ما يجب معالجته أولًا:

1. إغلاق الصلاحيات العامة الزائدة في RLS، وتقييد حق تعديل حقول الاشتراك والأدوار.
2. منع ربط حملة بمنتج أو عرض ترويجي تابع لحساب مختلف.
3. جعل التحقق من الطلب وصرف المكافأة قرارًا موثوقًا من الخادم.
4. إغلاق إعادة تفعيل الاشتراك من Checkout قديم، وترقية الحزم المتأثرة بعد اختبار التوافق.
5. تقييد إساءة استخدام المسارات العامة، ومراجعة مستلمي رسائل بيانات العملاء.

**الأداء:** توجد فرص مؤثرة لتقليل Invocations والعمل المتكرر وحجم الاستعلامات. قياس CPU الفعلي على Vercel غير متاح لعدم توفر Usage/Observability أو وصول للحساب. الأرقام المحلية الواردة لاحقًا قياسات تجريبية، وليست استهلاك Vercel أو تقدير فاتورته.

## 2. نطاق الفحص وما تم تنفيذه

| المجال | التنفيذ والنتيجة |
|---|---|
| مراجعة الكود | حصر 114 ملفًا متتبعًا و24 ملف API route؛ مراجعة المصادقة، RLS، المسارات العامة، الدفع، البريد، والاستعلامات |
| TypeScript | `npx tsc --noEmit --incremental false` — نجح دون أخطاء ودون كتابة build info |
| Lint | مراجعة 92 ملفًا بإعداد تدقيق خارجي `next/core-web-vitals` مع تسجيل إضافة TypeScript: 10 أخطاء JSX و3 تحذيرات hooks؛ لم تُطبّق fixes |
| Dependencies | `npm audit --omit=dev --json`: **31 حزمة متأثرة**؛ 2 Critical، و13 High، و12 Moderate، و4 Low |
| اختبارات الاستغلال المحلية | **22 مجموعة اختبار**: 17 لإعادة إنتاج سلوك غير آمن، وواحدة لحدود rate limiting، و4 مجموعات لضوابط تعمل؛ جميع assertions اكتملت |
| HTTP حي | 11 طلب GET محدودًا: صفحات عامة، dashboard، APIs، ومسارات ملفات إعدادات |
| JavaScript المنشور | قراءة `/login` ثم 14 ملف JavaScript مشارًا إليه في HTML؛ دون تشغيل كود الصفحة أو إرسال نماذج |
| قاعدة بيانات الإنتاج | 12 طلب HEAD فقط، باستخدام anon key المنشور، بعد إثبات تطابق URL والمفتاح مع JavaScript الموقع؛ لم تُنزّل محتويات الصفوف |
| الأسرار | لا تطابق للأسرار المحلية المعروفة في الملفات المتتبعة أو 172 ملف static محليًا أو ملفات الإنتاج الـ14 المختبرة |
| تاريخ Git | فحص 24 commit و229 blob فريدًا: لا تطابق للأسرار الحالية ولا للأنماط المحددة لمفاتيح خاصة وStripe/GitHub/AWS |
| CPU محلي | قياس تجميع أحداث Analytics وتوليد QR على بيانات وهمية؛ النتائج في القسم 7 |

إجمالي طلبات الموقع وقاعدة بياناته خلال الفحص: **38 طلب قراءة**، بخلاف البحث في التوثيق وتدقيق npm. لا تسجيل حسابات، ولا إرسال بريد، ولا تعديل/حذف سجلات، ولا دفع، ولا ضغط متعمد، ولا استغلال RCE/DoS على الإنتاج.

### معنى درجة الإثبات

- **حي:** رُصد فعليًا على النطاق أو قاعدة البيانات المرتبطة به.
- **تنفيذي معزول:** دوال TypeScript الأصلية شُغّلت بعد transpilation، مع mocks للخدمات والبيانات. يثبت مسار التنفيذ، ولا يحاكي PostgreSQL/RLS أو شبكة Vercel كاملة.
- **ثابت:** مستنتج مباشرة من الكود أو migrations الموجودة؛ يحتاج مطابقة سياسات وقواعد الإنتاج.
- **تنبيه حزمة:** الإصدار يقع ضمن نطاق advisory؛ قابلية الاستغلال تعتمد على الميزة والإعداد والنشر الفعلي.

**تنبيه تطابق النشر:** الـmiddleware المحلي يعتبر `/` مسارًا محميًا، بينما أعاد الإنتاج 200 للزائر. هذه قرينة تستدعي مطابقة commit وإعدادات النشر الفعلية. تطابق مشروع Supabase لا يثبت تطابق كود الإنتاج أو إصدار Next.js مع هذه النسخة المحلية.

## 3. نتائج الأمن بالتفصيل

### S01 — صلاحية عامة كاملة على campaign_products

**الأولوية: P0 — الخطورة: High — الإثبات: ثابت + قراءة حية.**

الموضع: [migration:18](D:/Zyrra/funnelflow/supabase/migrations/20260725_multi_product_campaigns.sql:18).

السياسة المسماة `Service role full access on campaign_products` مكتوبة بصيغة `FOR ALL USING (true) WITH CHECK (true)` بدون `TO service_role`. اسم السياسة لا يحدد جمهورها؛ افتراضي PostgreSQL هو `PUBLIC`. مع صلاحيات الجدول المناسبة، هذه السياسة تسمح لكل دور بالقراءة والتعديل والإضافة والحذف، وليست حصرية للخادم. [توثيق PostgreSQL](https://www.postgresql.org/docs/17/sql-createpolicy.html).

**ما ثبت حيًا:** طلب HEAD بمفتاح الزائر أعاد `206` و`0-0/4`، أي أربعة صفوف مرئية دون تسجيل دخول. **لم نختبر الكتابة أو الحذف على الإنتاج**، ولم نقرأ grants/policies الفعلية.

الأثر المحتمل: العبث بروابط الحملات والمنتجات بين الحسابات، وإظهار منتج حساب آخر عبر API يستخدم service role. UUID لا يُعد حاجز صلاحيات؛ بعض المعرّفات متاحة عبر بيانات الحملات العامة.

الإصلاح المقترح: إزالة السياسة العامة، وإضافة سياسات عضوية فعلية عند الحاجة، والتحقق من تطابق tenant للحملة والمنتج داخل قاعدة البيانات. لا يحتاج service role لسياسة عامة تسمح للزائر.

### S02 — RLS يعزل الصفوف لكنه لا يحمي الأدوار أو حقول الفوترة

**الأولوية: P0 — الخطورة: High — الإثبات: ثابت؛ التعديل الحي غير مختبر.**

المواضع: [tenants/users policies:362](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:362)، [subscriptions/invoices policies:392](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:392)، [تحديث tenant من المتصفح:137](D:/Zyrra/funnelflow/src/app/dashboard/settings/page.tsx:137).

سياسات `FOR ALL` تقارن tenant فقط. لا توجد في migrations قيود أعمدة أو سياسات owner/admin/member تحمي `plan`, `plan_status`, `trial_ends_at`, `stripe_customer_id`, `max_*` أو `users.role`. لذلك، إذا كانت grants الإنتاج تسمح بتحديث الأعمدة كما يفعل التطبيق لبعضها، يستطيع عضو الحساب طلب تعديل الحقول الحساسة مباشرة عبر Supabase خارج الواجهة. تحديث `plan` يشغّل أيضًا trigger يرفع limits.

بنفس التصميم، سجلات الفواتير والاشتراكات قابلة للكتابة داخل tenant وفق سياسة RLS الموجودة، وبيانات الاتصال `platform_connections` ليست معزولة عن الأعضاء وفق دورهم. تعليق `-- encrypted` على أعمدة token لا يثبت وجود تشفير تطبيقي فعلي.

الإصلاح المقترح: تخصيص سياسات لكل عملية، وحماية أعمدة الفوترة والأدوار بصلاحيات أعمدة أو واجهات خادم محددة، وجعل الاشتراكات والفواتير للقراءة فقط للمستخدم؛ كتابة بيانات الفوترة عبر خادم موثوق فقط. اختبار مستخدمين من نفس tenant بدورين مختلفين مهم بقدر اختبار tenantين مختلفين.

### S03 — ربط حملة بمنتجات أو عروض حساب آخر وتسريب بياناتها

**الأولوية: P0 — الخطورة: High — الإثبات: تنفيذي معزول + ثابت.**

المواضع: [campaign PATCH:65](D:/Zyrra/funnelflow/src/app/api/campaigns/[id]/route.ts:65)، [الكتابة وقراءة العلاقات:76](D:/Zyrra/funnelflow/src/app/api/campaigns/[id]/route.ts:76)، [multi-product create:114](D:/Zyrra/funnelflow/src/app/api/campaigns/route.ts:114).

PATCH يتحقق أن الحملة للمستخدم، لكنه يقبل `product_id`, `promotion_id`, `product_ids` دون التحقق أن الكيانات المشار إليها لنفس tenant. ثم يستخدم service role ويعيد `promotion:promotions(*)` و`product:products(*)`. إنشاء الحملة يتحقق من المنتج الأساسي والعرض، لكنه لا يتحقق من كل المنتجات الإضافية.

الاختبار المعزول أثبت مرور IDs لحساب B إلى كتابة service role لحملة الحساب A دون ownership query. الـforeign keys الموجودة تؤكد وجود السجل فقط، ولا تفرض نفس tenant. إذا لم توجد قيود إضافية في الإنتاج، قد يعيد المسار كوبونات وروابط تنزيل وحقول منتج لا تخص المستخدم.

الإصلاح المقترح: فحص ملكية جميع IDs، ورفض الطلب كله إذا اختلف العدد/المالك، وتطبيق قيد علاقة tenant داخل DB، واستخدام transaction لتغيير الحملة وروابطها معًا. اختبار القبول: معرّف حساب B في طلب حساب A يعيد 403/400 ولا يغير شيئًا ولا يعيد بيانات B.

### S04 — تجاوز التحقق من الطلب وصرف مكافآت دون استحقاق

**الأولوية: P0 — الخطورة: High — الإثبات: تنفيذي معزول.**

المواضع: [submit:64](D:/Zyrra/funnelflow/src/app/api/funnel/submit/route.ts:64)، [coupon response:161](D:/Zyrra/funnelflow/src/app/api/funnel/submit/route.ts:161)، [verify-order:54](D:/Zyrra/funnelflow/src/app/api/funnel/verify-order/route.ts:54)، [Amazon fallback:63](D:/Zyrra/funnelflow/src/lib/amazon/verify-order.ts:63)، [fraud checks:51](D:/Zyrra/funnelflow/src/lib/utils/fraud-detection.ts:51).

أُعيد إنتاج الآتي ببيانات وهمية:

- قبول `orderVerified:true` مع عدم إرسال order ID، وتسجيل الطلب `approved` رغم اشتراط الحملة التحقق.
- إعادة الكوبون من الاستجابة رغم `auto_deliver:false`, `is_active:false`, `max_redemptions:0`.
- اختيار العميل `platform:'custom'` والحصول على `verified:true` لقيمة `abc`؛ المنصة لا تُشتق بشكل موثوق من الحملة.
- Amazon يعيد `true` عندما تنقص credentials أو عند استثناء الاتصال. credentials المحلية الثلاثة فارغة؛ إعداد الإنتاج لم يُقرأ.
- كتابة عنوان من قائمة admin في حقل البريد تتجاوز كشف الاحتيال دون إثبات ملكية البريد.
- أخطاء استعلامات count تُعامل كأن العدد صفر، فتفشل آلية الاحتيال بطريقة تسمح بالطلب.
- قبول `promotionId` و`selectedProductIds` لا تنتمي بالضرورة للحملة. التحقق من شكل UUID وحده لا يثبت الملكية.

كذلك، فحص التكرار ثم INSERT منفصلان، ولا يوجد unique constraint مناسب على الحملة/البريد أو الطلب في migrations؛ الطلبات المتزامنة قد تتجاوز فحص التكرار. هذا الجانب تحليل ثابت وليس اختبار ضغط.

الإصلاح المقترح: تحقق خادمي مرتبط بالحملة والمنتج والطلب والمشتري، أو إثبات قصير العمر وموقع وذو استخدام واحد؛ تعطّل جهة التحقق ينتج حالة انتظار ولا ينتج verified. enforce حدود المكافأة وحالتها وموافقتها داخل transaction، وإزالة استثناءات بريد الاختبار، وتوحيد البريد وسياسة uniqueness.

### S05 — إرسال بيانات العملاء تلقائيًا إلى مستلمين ثابتين خارج حساب البائع

**الأولوية: P1 — الخطورة: High إذا لم يكن المستلمون مخولين — الإثبات: تنفيذي معزول.**

الموضع: [seller notification:120](D:/Zyrra/funnelflow/src/app/api/funnel/submit/route.ts:120).

كل submission ينشئ إشعارًا يتضمن البريد والاسم ورقم الطلب والتقييم ونص التعليق، ويرسله إلى بريد البائع **بالإضافة إلى عنوانين ثابتين في الكود**. الاختبار التقط ثلاثة استدعاءات إرسال وهمية. لم تُرسل أي رسالة حقيقية أثناء التدقيق.

هذا مسار مؤكد لنقل بيانات العملاء خارج قائمة مستلمي tenant. لم نفترض أن أصحاب العنوانين غير مخولين أو أن تسريبًا تاريخيًا وقع؛ يلزم التأكد من الغرض والصلاحيات واحتياج الوصول. العنوانان غير منسوخين هنا لتجنب نشر بيانات إضافية.

الإصلاح المقترح: مستلمون محددون لكل حساب، وإشعارات إدارة المنصة بأقل بيانات ممكنة، وإزالة المستلمين التجريبيين من تدفق الإنتاج، وتوثيق الحاجة إلى أي وصول إداري لبيانات العملاء.

### S06 — حزم قديمة مع تنبيهات أمنية مرتفعة وحرجة

**الأولوية: P0 — الخطورة: Critical على مستوى تدقيق الحزم؛ الاستغلال الحي غير مثبت.**

الموضع: [package.json:33](D:/Zyrra/funnelflow/package.json:33) و`package-lock.json`.

| الحزمة المثبتة | الإصدار/الحالة | التفسير |
|---|---|---|
| next الأساسي | 14.2.13 — Critical | خط 14.x خارج الدعم، وإصدار المشروع أقدم من إصلاحات كثيرة |
| next داخل react-email | 15.1.2 | نسخة مختلفة لها advisories إضافية؛ وجودها لا يثبت تشغيل preview server في الإنتاج |
| dompurify | 3.4.8 — Critical | dependency غير مباشرة؛ لم يثبت وصول مدخل مهاجم إلى نمط الاستخدام المتأثر |
| sharp | 0.33.5 — High | advisories للمكتبات الأصلية المستخدمة في معالجة الصور |
| zod | 3.25.76 — High | تنبيه استهلاك ذاكرة عند collections معينة؛ مسارات الاستخدام الفعلية تحتاج تقييمًا عند الترقية |

نتيجة npm هي **31 حزمة متأثرة وليست 31 اختراقًا مستقلًا**؛ قد تجمع الحزمة أكثر من advisory وقد تشمل سلسلة dependency موروثة. تم تدقيق production dependency graph، لا تدقيق كل أدوات التطوير كمجال مستقل.

ملاحظات تمنع تضخيم النتائج:

- Advisory تجاوز middleware `GHSA-f82v-jwr5-mffw` يشمل الإصدار المحلي، لكن ناشر Next.js يذكر حماية تلقائية لنشر Vercel من هذه الثغرة بعينها؛ لا نستنتج اختراق الموقع منها. [المصدر](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw).
- Advisory الصور `GHSA-2464-fhr4-w9xw` يصف خطر RCE مشروطًا ببيئة ومعالجة صور محددة. `remotePatterns` يسمح بكل `*.supabase.co`، لكن خدمة Image Optimization الفعلية وإصدارها على Vercel لم يتم إثباتهما ولم تُرسل صورة هجومية. الإصلاح المنشور لهذا advisory في Next 15.5.28/16.4.1 وsharp 0.35.5؛ هذه حدود هذا advisory وليست توصية بأن تلك الإصدارات تغطي كل تنبيهات اليوم. [المصدر](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- Advisory `GHSA-p3m5-59mp-jv5r` يسبب CPU DoS عند وجود Server Actions. الكود يتضمن تصريح `use server` في [billing:45](D:/Zyrra/funnelflow/src/app/dashboard/settings/billing/page.tsx:45)، لكنه helper غير مستخدم؛ إدراجه في build النهائي وقابلية المسار للوصول لم يُثبتا. [المصدر](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r).

الإصلاح المقترح: ترقية مدروسة لخط Next.js مدعوم وبإصدار patched وقت التنفيذ، ومراجعة dependencies غير المباشرة، وتشغيل اختبارات auth/billing/funnel/build. لا تستخدم `npm audit fix --force` بلا تقييم تغييرات major. [سياسة الدعم](https://nextjs.org/support-policy).

### S07 — إعادة تفعيل اشتراك ملغي من Checkout مكتمل قديم

**الأولوية: P0 — الخطورة: High — الإثبات: تنفيذي معزول.**

الموضع: [billing/activate:21](D:/Zyrra/funnelflow/src/app/api/billing/activate/route.ts:21).

GET يأخذ `session_id`، ولا يطلب مستخدمًا مسجلًا ولا يثبت ملكية الجلسة. يكفي `session.status === 'complete'` ليكتب `plan_status:'active'` دون التحقق من حالة subscription الحالية أو صلاحية الدفع. الجلسة المكتملة قد تبقى مكتملة بعد إلغاء الاشتراك.

الاختبار استخدم Stripe mock يعيد checkout مكتملًا وsubscription ملغيًا؛ كتب المسار active دون استدعاء auth. يشترط الاستغلال معرفة session ID صالح، مثل جلسة شراء سابقة تخص المستخدم؛ لا يعني تخمين جميع الجلسات.

الإصلاح المقترح: التحقق من المستخدم والـtenant وcustomer، واستخدام الحالة الحالية للاشتراك كمصدر الحقيقة، وتوحيد التحديث مع webhook بشكل idempotent. لا تنفذ تغيير حالة عبر GET.

### S08 — إدخال عام مباشر إلى submissions/events يتجاوز تحقق التطبيق

**الأولوية: P1 — الخطورة: High — الإثبات: ثابت؛ لم تُجرَ كتابة حية.**

المواضع: [public insert policies:402](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:402)، [event route:14](D:/Zyrra/funnelflow/src/app/api/funnel/event/route.ts:14).

سياسات `public_funnel_insert` و`public_event_insert` تستخدم `WITH CHECK (TRUE)`. إذا كانت grants الإنتاج تسمح بالإدخال، يمكن تجاوز `/api/funnel/submit` تمامًا وإرسال tenant/campaign/order_verified/claim_status مباشرة إلى Supabase. القيود الموجودة لا تربط tenant بالسجلات المشار إليها.

API الأحداث نفسه يقبل `eventType` و`submissionId` دون إثبات session أو ملكية submission. اختباره المعزول أثبت تمرير submission ID غير مرتبط للحملة إلى INSERT. يمكن تزوير analytics وتضخيم حجم البيانات. تأثير trigger على العدادات عند الإدخال المباشر يعتمد على صلاحيات دور التنفيذ؛ لم نفترض نجاحه لجميع الأدوار.

الإصلاح المقترح: قصر الكتابة على مسار موثوق محدود الصلاحيات، واشتقاق tenant والحقول المحمية على الخادم، وتحقق العلاقات وallowlist للأحداث وidempotency. إصلاح endpoint وحده غير كافٍ مع بقاء الإدخال المباشر مفتوحًا.

### S09 — أي مستخدم authenticated يستطيع قراءة قائمة الانتظار وفق migration

**الأولوية: P1 — الخطورة: High للخصوصية — الإثبات: ثابت.**

الموضع: [waitlist read policy:21](D:/Zyrra/funnelflow/supabase/migrations/20260810_platform_mode_setting.sql:21).

شرط القراءة هو `auth.role() = 'authenticated'` فقط؛ لا يوجد تحقق platform admin أو tenant. إذا طبقت السياسة كما هي، فإن أي حساب يستطيع قراءة عناوين ونصوص `waitlist_requests`، حتى لو لم تعرضها واجهته.

الفحص الحي كزائر أعاد صفر صفوف مرئية؛ **لم يتوفر حساب عادي لفحص القراءة بعد تسجيل الدخول**. صفر صفوف للزائر لا ينفي هذه المشكلة.

الإصلاح المقترح: قصر القراءة على صلاحية إدارة منصة تُحدد في الخادم/DB، واختبار مستخدم عادي مقابل administrator.

### S10 — Webhook البريد لا يتحقق من توقيع Resend

**الأولوية: P1 — الخطورة: Medium — الإثبات: تنفيذي معزول.**

الموضع: [Resend webhook:4](D:/Zyrra/funnelflow/src/app/api/webhooks/resend/route.ts:4).

تمرير `type` و`data.email_id` بدون أي signature يصل إلى service-role UPDATE. شخص يعرف email ID قد يزيف sent/delivered/bounced/failed. أيضًا، `email.delivered` يكتب `opened_at` رغم أن التسليم لا يعني فتح الرسالة.

الإصلاح المقترح: تحقق التوقيع على raw body باستخدام Svix أو SDK متوافق، مع timestamp/replay handling. لا يُفترض أن SDK الحالي يملك أحدث helper قبل مراجعته. [توثيق Resend](https://resend.com/docs/webhooks/verify-webhooks-requests).

### S11 — مسارات عامة قابلة للإساءة وحقن HTML داخل البريد

**الأولوية: P1 — الخطورة: High للتكلفة والإساءة، Medium لحقن البريد — الإثبات: ثابت + تنفيذي معزول.**

المواضع: [waitlist:5](D:/Zyrra/funnelflow/src/app/api/waitlist/route.ts:5)، [notification HTML:126](D:/Zyrra/funnelflow/src/app/api/funnel/submit/route.ts:126)، [in-memory limiter:21](D:/Zyrra/funnelflow/src/app/api/funnel/verify-order/route.ts:21).

`submit`, `event`, `waitlist` تفتقر داخل التطبيق إلى rate limit مشترك أو CAPTCHA أو حد schema واضح للأطوال/الحجم. اكتشاف fraud لا يمنع إنشاء submission/event ولا محاولة إشعار البائع؛ flagged ليس حاجز إساءة استخدام. waitlist يحاول إرسال البريد حتى إذا فشل INSERT.

الاختبار المعزول أثبت قبول بريد غير صالح لا يحتوي إلا شرط `@`، ودخول `<b data-audit="true">` كما هو في HTML الرسالة. هذا **HTML injection في البريد**؛ لم يُثبت تنفيذ JavaScript داخل متصفح/عميل بريد، ولا يدّعي التقرير وجود stored browser XSS مؤكدة.

Rate limiting الخاص بالتحقق يعتمد على Map داخل instance: الطلب المحلي الحادي عشر أعاد 429، وinstance جديد قبل الطلب. لا يوفر حدًا موزعًا على Vercel. يجب كذلك تطبيع عنوان IP وفق proxy موثوق؛ قراءة `x-forwarded-for` كاملة قد تنتج سلسلة غير صالحة لـINET. لم يُثبت إمكان تزوير هذا الهيدر عبر Cloudflare/Vercel.

الإصلاح المقترح: schema خادمي مع حدود أحجام، limiter مشترك لكل IP/حملة، deduplication، قيود DB، escaping لقيم النص داخل البريد، وتقييد rich HTML والروابط. ضبط WAF مفيد، لكنه لا يغلق Supabase المكشوف مباشرة. إعداد WAF الحالي لم يُقرأ.

### S12 — كشف بيانات الحملات بشكل أوسع من واجهة العرض

**الأولوية: P1 — الخطورة: Medium — الإثبات: قراءة حية + ثابت + تنفيذي معزول.**

المواضع: [public campaign policy:399](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:399)، [public API:10](D:/Zyrra/funnelflow/src/app/api/funnel/[code]/route.ts:10)، [campaign analytics:17](D:/Zyrra/funnelflow/src/app/dashboard/campaigns/[id]/analytics/page.tsx:17).

السياسة تسمح بقراءة الصف الكامل للحملات active عبر Supabase دون امتلاك QR code مسبقًا. لا يقتصر التعرض على حقول UI؛ schema يحتوي IDs، وأرقام scans/completions، والإعدادات. HEAD حي أعاد صفين مرئيين. لم يتم تنزيل بياناتهما.

كذلك API `/api/funnel/[code]` يستخدم service role ولا يشترط `status='active'`؛ الاختبار المعزول أعاد حملة paused. صفحة campaign analytics لا تضيف tenant filter عند قراءة الحملة، وتعتمد على RLS التي تسمح بالحملات العامة، فتحتاج مراجعة فصل الإحصاءات الداخلية عن المحتوى العام.

الإصلاح المقترح: واجهة/عرض public محدود الحقول، وربط الوصول بالحالة المطلوبة، وفصل إحصاءات tenant عن بيانات funnel العامة. قراءة بيانات تسويقية مقصودة ليست بذاتها ثغرة؛ الخطر في الحقول الإضافية وعدم حدود العلاقات.

### S13 — Open redirect في auth callback

**الأولوية: P1 — الخطورة: Medium — الإثبات: تنفيذي معزول.**

الموضع: [auth callback:7](D:/Zyrra/funnelflow/src/app/api/auth/callback/route.ts:7).

يُركّب redirect باستخدام `${origin}${next}`. قيمة مثل `@example.invalid/` تجعل URL النهائي بصيغة `https://audit.invalid@example.invalid/`، والمضيف الحقيقي يصبح `example.invalid`. أُثبت ذلك محليًا بعد محاكاة نجاح exchangeCodeForSession؛ لم يُفتح الرابط ولم تُستخدم جلسة حقيقية.

يشترط المسار نجاح تبادل code؛ لا يعني أن كل طلب عشوائي يعيد توجيه المستخدم أو يسرق session تلقائيًا. الأثر المؤكد في المنطق هو السماح بوجهة خارجية وما يتيحه من phishing.

الإصلاح المقترح: allowlist لمسارات نسبية تبدأ بشرطة واحدة `/`، وبناء URL ثم التأكد أن origin النهائي يساوي origin الموقع.

### S14 — حماية الخطة وPrivate mode موجودة أساسًا في العرض

**الأولوية: P1 — الخطورة: Medium — الإثبات: ثابت.**

المواضع: [dashboard access check:39](D:/Zyrra/funnelflow/src/app/dashboard/layout.tsx:39)، [product POST:32](D:/Zyrra/funnelflow/src/app/api/products/route.ts:32)، [registration mode:40](D:/Zyrra/funnelflow/src/app/(auth)/register/page.tsx:40)، [tenant creation:6](D:/Zyrra/funnelflow/src/app/api/tenants/route.ts:6).

layout يمنع واجهة dashboard عند انتهاء الخطة، لكن APIs لا تطبق نفس فحص الاشتراك. product POST يقرأ max_products ولا يستخدمه كحاجز. إنشاء promotions من المتصفح يعتمد على RLS، وليس حدًا ذريًا. campaign limit في API عبارة عن count ثم insert ويمكن تجاوزه بمسار DB مباشر إن بقيت grants والسياسات الحالية.

Private mode يمنع نموذج التسجيل في UI، لكن `/api/tenants` لا يفحص وضع المنصة. القدرة على إنشاء مستخدم جديد تعتمد أيضًا على إعدادات Supabase Auth، وهي غير متاحة في هذه المراجعة. تخصيص الموقع admin-only في React لا يثبت حماية DB؛ migration إنشاء `site_settings` وسياسات كتابتها غير موجودة في المستودع.

الإصلاح المقترح: enforcement خادمي وDB لكل خطة ودور، ومصدر موحد لسياسة التسجيل والاشتراك؛ تصدير السياسات الفعلية وإدراج migration إنشاء site_settings.

### S15 — هيدرز حماية ناقصة وإدخال URLs دون سياسة خادمية واضحة

**الأولوية: P2 — الخطورة: Medium/تحصين — الإثبات: حي + ثابت.**

المواضع: [security headers:10](D:/Zyrra/funnelflow/next.config.js:10)، [review window:261](D:/Zyrra/funnelflow/src/components/funnel/UnifiedFunnel.tsx:261).

الفحص الحي لم يجد CSP على الصفحات المختبرة، ولم يجد X-Frame-Options على `/login` أو `/pricing` أو `/`، بينما وجده `DENY` على dashboard/APIs. هذه فجوة تحصين ضد clickjacking وتقليل أثر XSS؛ لم تُبنَ صفحة هجوم حية.

قيم review/download/image URLs تُقبل في APIs دون تحقق صارم من النوع والمخطط. مسار UnifiedFunnel يستعمل `window.open(url,'_blank')` دون `noopener,noreferrer`، بينما المكون القديم StepReviewRequest يستخدمهما. لم يتم إثبات تنفيذ javascript URL في متصفح حديث؛ الملاحظة هي غياب ضمان scheme آمن وإمكان توجيه الزائر لوجهة غير موثوقة.

الإصلاح المقترح: CSP تُطرح أولًا بوضع Report-Only، مع حماية `frame-ancestors`، وتحقق URLs خادميًا، وتقييد نطاقات الصور بالاحتياج الفعلي. يجب مراعاة inline theme script عند تصميم CSP.

## 4. أعطال سلامة البيانات والاعتمادية

هذه نتائج إضافية تؤثر في صحة المنتج والأداء، وليست كلها ثغرات وصول:

| النتيجة | الدليل | الأثر والإصلاح المقترح |
|---|---|---|
| رسائل المكافأة تُرسل فعليًا لعنوان اختبار واحد فقط، ثم يُسجل غيره delivered | [submit:213](D:/Zyrra/funnelflow/src/app/api/funnel/submit/route.ts:213)، [approve:76](D:/Zyrra/funnelflow/src/app/api/claims/[id]/approve/route.ts:76)، [deliver:67](D:/Zyrra/funnelflow/src/app/api/claims/[id]/deliver/route.ts:67) | إزالة شروط الاختبار وتحديث الحالة فقط بعد نتيجة تسليم معتمدة؛ نتيجة Resend التي تحتوي error يجب فحصها |
| `status:'skipped'` غير موجود ضمن CHECK الظاهر في schema | [email schema:216](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:216) | قد يفشل تسجيل delivery بصمت ثم يُحدّث claim؛ يلزم مطابقة schema الإنتاج ومعالجة error |
| Stripe subscription upsert لا يرسل tenant_id | [webhook:54](D:/Zyrra/funnelflow/src/app/api/webhooks/stripe/route.ts:54)، [schema:270](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:270) | أول INSERT يفشل مع NOT NULL حسب schema؛ المسار يتجاهل نتيجة الخطأ ويرجع نجاحًا؛ يجب lookup للـtenant ومعالجة الخطأ وإعادة المحاولة |
| حالات Stripe لا تتطابق جميعها مع plan_status CHECK | [webhook:48](D:/Zyrra/funnelflow/src/app/api/webhooks/stripe/route.ts:48)، [tenant schema:22](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:22) | حالات مثل incomplete/unpaid ليست في CHECK؛ mapping صريح مطلوب |
| مخططات dashboard تحتوي أرقامًا عشوائية ونسبًا ثابتة | [dashboard:61](D:/Zyrra/funnelflow/src/app/dashboard/page.tsx:61) | ليست بيانات أداء أو تحويل موثوقة؛ استبدالها بتجميع فعلي |
| analytics API يعيد `{ data: {} }` | [analytics API:9](D:/Zyrra/funnelflow/src/app/api/analytics/dashboard/route.ts:9) | endpoint غير مكتمل، وليس مصدر قياسات فعلية |
| migration تعدّل site_settings دون تضمين إنشائها | [migration:2](D:/Zyrra/funnelflow/supabase/migrations/20260810_platform_mode_setting.sql:2) | لا يمكن إعادة بناء DB كاملة والتحقق من سياساتها من المستودع وحده |

## 5. نتائج الفحص الحي

### HTTP والحماية من كشف الملفات

الزمن أدناه لعينة واحدة من بيئة الفحص، شامل الاتصال واستلام body؛ **ليس TTFB أو p95 أو Lighthouse أو CPU**.

| المسار | HTTP | الزمن ms | النتيجة |
|---|---:|---:|---|
| `/` | 200 | 1320 | `no-store`, Vercel MISS، لا CSP أو X-Frame-Options |
| `/login` | 200 | 276 | Vercel HIT، لا CSP أو X-Frame-Options |
| `/pricing` | 200 | 309 | Vercel HIT، لا CSP أو X-Frame-Options |
| `/dashboard` | 307 | 249 | redirect إلى `/login`، مع `X-Frame-Options: DENY` |
| `/api/products` | 401 | 1068 | Unauthorized، لا بيانات |
| `/api/campaigns` | 401 | 303 | Unauthorized، لا بيانات |
| `/api/claims` | 401 | 268 | Unauthorized، لا بيانات |
| `/api/analytics/dashboard` | 401 | 223 | Unauthorized، لا بيانات |
| `/.env` | 404 | 81 | لا محتوى environment |
| `/.env.local` | 404 | 78 | لا محتوى environment |
| `/.git/config` | 404 | 113 | لا محتوى Git config |

HSTS وnosniff وReferrer-Policy وPermissions-Policy موجودة على الردود المختبرة. ظهر Cloudflare أمام الموقع مع هيدرز Vercel. HTTPS نجح بالتحقق الافتراضي من الشهادة؛ لم يُجرَ مسح شامل للبروتوكولات/cipher suites. `cache-control: public, max-age=0, must-revalidate` ظهر على ردود 401؛ لا يثبت cache leak، لكن يجب اختبار ردود المستخدمين المسجلين وضبط خصوصيتها صراحة عند الحاجة.

### Supabase: قراءة مجهولة باستخدام المفتاح العام المنشور

استُخدم `HEAD ?select=*&limit=1` مع `Prefer: count=exact`، ولم تُنزّل أسماء أو إيميلات أو محتويات الصفوف.

| الجدول | HTTP | الصفوف المرئية للزائر في لحظة الفحص |
|---|---:|---:|
| campaigns | 206 | 2 |
| campaign_products | 206 | 4 |
| site_settings | 200 | 1 |
| funnel_submissions | 200 | 0 |
| users | 200 | 0 |
| tenants | 200 | 0 |
| promotions | 200 | 0 |
| platform_connections | 200 | 0 |
| email_deliveries | 200 | 0 |
| waitlist_requests | 200 | 0 |
| subscriptions | 200 | 0 |
| invoices | 200 | 0 |

**صفر صفوف مرئية يعني عدم رؤية صفوف في هذا الطلب فقط:** قد ينتج عن RLS أو عدم وجود بيانات. لا يثبت صحة صلاحيات الكتابة أو فصل الحسابات المسجلة. نشر anon key طبيعي في تطبيق Supabase؛ المشكلة تكون في policies/grants، وليس وجود المفتاح العام في JavaScript.

## 6. تحليل الأداء ومصادر تكلفة Vercel

### P01 — Claims يولّد خمس API requests عند التحميل أو التحديث

الموضع: [claims page:39](D:/Zyrra/funnelflow/src/app/dashboard/claims/page.tsx:39).

طلب للقائمة وأربعة طلبات منفصلة للعدادات. كل طلب يعيد فحص auth وuser lookup وquery بعد المرور بالـmiddleware المحلي. طلبات العدادات تجلب صفًا وعلاقات وPII لا تستخدمها الواجهة في هذا السياق.

**الأثر:** Invocations وتحقق متكرر ونقل بيانات أكثر. تقليلها إلى endpoint واحد يعيد الصفحة والعدادات يخفض عدد تلك الطلبات من 5 إلى 1؛ هذا **لا يعني ضمان خفض CPU أو الفاتورة 80%** لأن العمل الداخلي وحجم البيانات يختلفان.

### P02 — تجميع analytics في Node بدل قاعدة البيانات

المواضع: [analytics queries:36](D:/Zyrra/funnelflow/src/app/dashboard/analytics/page.tsx:36)، [date grouping:75](D:/Zyrra/funnelflow/src/app/dashboard/analytics/page.tsx:75)، [ratings:49](D:/Zyrra/funnelflow/src/app/dashboard/page.tsx:49).

صفحة analytics تنفذ عشرة استعلامات متوازية ثم query للتعليقات، بخلاف queries الصفحة/layout/auth. تُجلب ratings وأحداث فترة كاملة ثم تُجمع في JavaScript. لا توجد pagination لتلك المجموعات؛ حد Supabase الافتراضي للصفوف قد يجعل الرسوم ناقصة عند نمو البيانات. [توثيق select](https://supabase.com/docs/reference/javascript/v1/select).

**الأثر:** JSON parsing وتجميع وتنسيق تاريخ على CPU الخاص بـVercel؛ زمن العدّ والتجميع داخل SQL يستهلك قاعدة البيانات نفسها. الإصلاح المقترح RPC/view للتجميع حسب اليوم/التقييم/الحالة، بإرجاع مجموعات صغيرة، مع tenant scoping. إعادة استخدام `Intl.DateTimeFormat` تحسين محدود مثبت محليًا، لكن الأفضل تقليل البيانات قبل نقلها أصلًا.

### P03 — تكرار auth والـtenant والعدادات

المواضع: [middleware:27](D:/Zyrra/funnelflow/middleware.ts:27)، [session:32](D:/Zyrra/funnelflow/src/lib/supabase/middleware.ts:32)، [dashboard layout:18](D:/Zyrra/funnelflow/src/app/dashboard/layout.tsx:18)، [dashboard page:11](D:/Zyrra/funnelflow/src/app/dashboard/page.tsx:11).

المسار المحلي يستدعي getUser في middleware ثم layout ثم الصفحة/route، ويعيد بعض بيانات tenant وpending claims. SDK قد يتجنب شبكة فعلية عند عدم وجود session، وقد يحدث deduplication لبعض الاستدعاءات؛ لذلك هذه **مواقع استدعاء في الكود وليست قياسًا مؤكدًا لثلاث رحلات شبكة لكل طلب**.

الإصلاح المقترح: helper موحد مع memoization داخل request للـserver components؛ تضييق matcher للمسارات التي تحتاج refresh مع الإبقاء على auth داخل handlers. لا تستخدم cache عامًا للجلسات أو بيانات tenant.

### P04 — الصفحة الرئيسية ديناميكية وقراءة إعدادات متكررة

الموضع: [landing:29](D:/Zyrra/funnelflow/src/app/page.tsx:29).

الصفحة تقرأ cookies/user وsite_settings. الإنتاج أعاد `private, no-cache, no-store` وMISS في العينة؛ login/pricing أعادا HIT. هذا يمنع مشاركة cache للـHTML الحالي ويزيد rendering مع الزيارات.

الإصلاح المقترح: فصل المحتوى التسويقي العام القابل للتخزين عن الجزء الخاص بحالة الدخول، وإعادة تحقق settings العامة عند التعديل. لا تُخزن نسخة personalized في cache مشترك، ولا cache للـprivate-mode admin bypass.

### P05 — funnel يضيف طلب بيانات وطلب tracking بعد تحميل الصفحة

المواضع: [funnel page:3](D:/Zyrra/funnelflow/src/app/f/[code]/page.tsx:3)، [effect:22](D:/Zyrra/funnelflow/src/app/f/[code]/page.tsx:22)، [funnel API:28](D:/Zyrra/funnelflow/src/app/api/funnel/[code]/route.ts:28).

كل زيارة عادية للصفحة تطلق GET للحملة ثم POST للحدث. GET يحتوي 5–6 استعلامات ممكنة، منها أربع متوازية بعد تحميل الحملة. matcher لا يستثني `/api/funnel/*` رغم استثناء `/f/*` من session refresh. `force-dynamic` يستدعي مراجعة الحاجة لتوليد الصفحة لكل زيارة.

الإصلاح المقترح: تقليل queries بقراءة مضبوطة الحقول، وcache قصير للبيانات العامة بعد ضبط إبطال cache عند pause/edit، وتقليل tracking المكرر. إبقاء بيانات المكافآت الحساسة خارج cache العام.

### P06 — QR PNG يعاد توليده على كل تنزيل

المواضع: [QR route:21](D:/Zyrra/funnelflow/src/app/api/campaigns/[id]/qr/route.ts:21)، [PNG generation:33](D:/Zyrra/funnelflow/src/lib/qr/generate.ts:33).

توليد PNG بحجم 600px وضغطه عمل CPU مباشر. SVG مخزن بالفعل أثناء إنشاء الحملة لكن route يعيد التوليد. عدد الطلبات/الألوان المختلفة غير مقيد في التطبيق.

الإصلاح المقترح: إعادة استخدام artifact أو cache keyed by campaign/code/color/format بعد تحقق صلاحية المستخدم، والتحقق من format/color وتحديد rate limit. الصور العامة في UI حاليًا تستخدم غالبًا `<img>`؛ لا يصح افتراض أن معظم استهلاك CPU الحالي ناتج عن Next Image Optimization.

### P07 — مهام البريد بعد الاستجابة بلا ضمان إكمال

الموضع: [submit background work:104](D:/Zyrra/funnelflow/src/app/api/funnel/submit/route.ts:104).

`deliverPromotion(...).catch(...)` وasync IIFE يعملان دون await أو queue أو waitUntil. قد يُرسل الرد قبل انتهاء البريد/تسجيل حالته، ولا يوجد ضمان عمر execution بعده. السرعة الظاهرة لا تثبت نجاح المهمة. [توثيق Vercel للمهام](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package).

الإصلاح المقترح: queue مع retry وidempotency للمهام المهمة؛ أو await/waitUntil الملائم للنسخة والبيئة للمهام القصيرة. عدم الانتظار لا يجعل CPU أو طلبات الطرف الثالث مجانية.

### P08 — فهارس مكررة وغياب حد للصفحات

المواضع: [initial indexes:304](D:/Zyrra/funnelflow/supabase/migrations/001_initial_schema.sql:304)، [later indexes:5](D:/Zyrra/funnelflow/supabase/migrations/20260831_performance_indexes.sql:5)، [claims pagination:15](D:/Zyrra/funnelflow/src/app/api/claims/route.ts:15).

`idx_products_tenant` و`idx_products_tenant_id` لهما نفس الأعمدة؛ وكذلك أسماء أخرى للحملات/submissions/events. `IF NOT EXISTS` يفحص الاسم، لا تطابق تعريف index. index على qr_short_code يكرر عادة index الـUNIQUE. يلزم التحقق من `pg_indexes` و`pg_stat_user_indexes` في الإنتاج قبل حذف شيء.

الفهارس الزائدة ترفع تكلفة الكتابة والتخزين في Supabase أساسًا، ولا تمثل مباشرة CPU Vercel. fraud IP/time query يحتاج تقييم index مناسب بـEXPLAIN بعد معرفة حجم البيانات. `per_page` غير مقيد ولا يُتحقق من كونه عددًا صحيحًا موجبًا؛ قواعد max rows من Supabase لا تغني عن حدود API صريحة.

## 7. قياس CPU المحلي

**البيئة:** Windows، Node v26.2.0، Intel Core Ultra 9 185H. خمس iterations لكل تجربة بعد warm-up؛ `process.cpuUsage()` يشمل user+system CPU للعملية. بيانات وهمية بالكامل ودون شبكة.

| التجربة | متوسط الزمن ms | متوسط CPU ms |
|---|---:|---:|
| تعبير تجميع التواريخ الحالي لـ1000 حدث وهمي | 54.14 | 47.0 |
| المقارنة: formatter واحد مع نفس 1000 حدث | 3.32 | 3.0 |
| QR SVG 300px | 0.70 | أقل من دقة العينة؛ ظهر 0 |
| QR PNG 600px | 22.19 | 21.8 |

المقارنة تدعم أولوية تقليل إنشاء formatters وتوليد PNG المتكرر. لا تُعمم النسبة على الطلب الكامل أو الإنتاج: العينة صغيرة، وWindows CPU accounting له دقة محدودة، كما تختلف أجهزة/إصدارات Node والـruntime في Vercel. لم يعدل الكود لإجراء المقارنة.

ملفات JavaScript المشار إليها في HTML صفحة login بلغ مجموع أحجامها المفكوكة **810,228 bytes ≈ 791 KiB** عبر 14 ملفًا. هذه ليست transferred/gzip bytes ولا initial JS المنفذ لكل متصفح: تتضمن polyfills وقد تختلف الموارد المستخدمة. لم يجرَ Lighthouse أو قياس LCP/INP/CLS، ولا تحليل production bundle محلي جديد.

## 8. كيف نحدد استهلاك Vercel بدقة

مع Fluid Compute، **Active CPU** هو زمن تنفيذ الكود، أما انتظار Supabase/Stripe فلا يُحسب بنفسه كـActive CPU، بينما يطيل زمن استخدام الذاكرة. Invocations مقياس مستقل. Legacy duration billing مختلف، لذلك يلزم معرفة وضع المشروع قبل حساب التكلفة. [توثيق Vercel](https://vercel.com/docs/functions/usage-and-pricing)، [الذاكرة ونموذج الفوترة القديم](https://vercel.com/docs/functions/configuring-functions/memory).

البيانات المطلوبة لإغلاق هذا الجزء، لنفس الفترة الزمنية وآخر deployment:

| البيانات | الغرض |
|---|---|
| Fluid Compute enabled، plan، region، memory، deployment commit | تحديد البيئة ونموذج الفوترة ومطابقة الكود |
| Active CPU total + per route/function خلال 7–30 يومًا | معرفة المسارات المستهلكة فعليًا |
| Invocations per route، errors/timeouts، traffic/bot split | تمييز كثرة الطلبات عن بطء الطلب الواحد |
| p50/p95 duration وCPU إن توفر، والـcold starts | ترتيب الاختناقات وقياس أثر التغيير |
| Provisioned Memory usage وcache hit ratio | تقدير أثر انتظار DB/cache، منفصلًا عن CPU |
| Supabase slow queries وEXPLAIN على staging مماثل | فصل تكلفة DB عن تكلفة Vercel |
| WAF/rate-limit configuration | تقييم الحماية الخارجية للمسارات العامة |

بعد توافر القياسات: رتّب المسارات حسب مجموع CPU أولًا، ثم CPU/request وInvocations، وقارن قبل/بعد على حجم مرور متقارب. الصيغة الحسابية لـCPU-hours هي `sum(active_cpu_ms) / 3,600,000`؛ لا يمكن تعبئتها بزمن HTTP أو قياس الجهاز المحلي.

## 9. الضوابط التي عملت وحدود التغطية

النتائج الإيجابية:

- أربع APIs حية رفضت الزائر بـ401، وdashboard أعاد redirect للدخول.
- عشر entry points محلية رفضت المستخدم المجهول قبل DB access، وapprove/deliver رفضا claim لحساب آخر.
- Stripe webhook يفحص وجود التوقيع، ويستدعي التحقق قبل DB؛ اختبار رفض التوقيع غير الصالح استخدم verifier وهميًا يرمي خطأ، وليس اختبار تشفير مستقلًا للـSDK.
- حقول product/promotions PATCH تستخدم allowlist، وكثير من عمليات القراءة/التغيير تقيد tenant صراحة.
- لا تطابق للأسرار الخاصة في النطاقات المحلية والمنشورة المختبرة؛ `.env.local` غير متتبع وملفات environment الثلاثة المحددة لم تظهر في history.
- لم يظهر من المراجعة مسار raw SQL مبني بدمج نص العميل، أو تنفيذ أوامر OS/eval بمدخل مستخدم. هذا ليس ضمان غياب كل أشكال injection.
- `dangerouslySetInnerHTML` في layout خاص بنص theme ثابت؛ لم نجد فيه دمجًا مباشرًا لقيمة من مستخدم.

ما بقي غير محسوم:

- اختبار authenticated tenant A/B وowner/member على الإنتاج أو staging: لا حسابات اختبار متاحة، ولم تُنشأ حسابات.
- صلاحيات كتابة DB الحية، وgrants/column privileges/policies المنشورة، وStorage buckets وملفاتها: لم تُفحص إداريًا ولم تُغيّر.
- إعدادات Supabase Auth: كلمة المرور، email confirmation، MFA، session expiry، redirect allowlist، وحدود تسجيل الدخول؛ مراجعة UI لا تكفي لإثباتها. يوجد اختلاف بين حد كلمة المرور في register وreset UI.
- `site_settings` admin write isolation وprivate signup enforcement: يلزمان سياسات الإنتاج غير الموجودة في المستودع.
- CSRF الفعلي وسلوك cookies/CORS مع جلسات مسجلة؛ GET المتغير للحالة في billing مذكور، ولم تُجرَ تجربة تغيّر حسابًا.
- exploitability الفعلية لكل advisory وحالة خدمة image optimization، أو headers مبنية من proxies؛ لا توجد محاولات RCE/DoS أو صور خبيثة.
- logs/monitoring/backups/retention/deletion/encryption وإذن المستلمين الثابتين: لا صلاحية إدارية متاحة للتحقق.
- فحص TLS شامل، DAST fuzzing شامل، race/load testing، production build جديد، Lighthouse، وقياسات Vercel CPU الفعلية لم تُنفّذ. الـ`.next` المحلي لا يحتوي BUILD_ID إنتاجيًا صالحًا للاعتماد عليه.

**لا توجد شهادة «آمن 100%».** هذه مراجعة محددة الأدلة؛ عدم ظهور تسريب مباشر في اختبار زائر لا يلغي ثغرات الصلاحيات ومسارات الخدمة الموضحة.

## 10. خطة الإصلاح وإعادة الاختبار المقترحة — لم تُنفذ

| الأولوية | الإجراء | معيار القبول |
|---|---|---|
| P0 | إصلاح S01–S03 وسياسات العلاقات/الفوترة | anon لا يعدل junction؛ حساب A لا يقرأ/يربط بيانات B؛ member لا يغير دوره/الخطة/customer ID |
| P0 | إصلاح S04 | مدخل orderVerified لا يمنح امتيازًا؛ بدون تحقق موثوق لا مكافأة؛ manual/inactive/exhausted لا يعيد كوبونًا |
| P0 | إصلاح S07 | جلسة قديمة لا تعيد canceled/unpaid إلى active؛ ملكية المستخدم مؤكدة |
| P0 | تحديث dependencies بعد مراجعة advisory reachability | تدقيق محدث دون Critical/High غير مقبولة، واختبارات auth/funnel/billing/build ناجحة |
| P1 | إغلاق الإدخال المباشر وwaitlist read وإثبات webhook | فشل طلبات غير المخولين/غير الموقعة، ونجاح الطلبات المشروعة فقط |
| P1 | rate limits وvalidation وrecipient scoping | إساءة الاستخدام مرفوضة قبل DB/email؛ لا PII إلى مستلم خارج التفويض |
| P1 | transaction/idempotency وإصلاح delivered/webhooks | لا reward مزدوج مع التزامن، ولا delivered دون تسليم، وإعادة webhook آمنة |
| P1 | دمج claims requests وتجميع analytics | نفس النتائج الصحيحة بعد تجاوز 1000 صف، مع قياس انخفاض Invocations/CPU |
| P2 | public caching وQR reuse وheaders/URL validation | cache لا يخلط مستخدمين؛ تحسن موثق دون كسر funnel أو تسجيل الدخول |

إعادة الاختبار المثالية تكون في staging ببيانات مصطنعة وحسابين منفصلين وعضو منخفض الصلاحية، مع حالات متجرحة للصلاحيات والطلبات والاشتراكات. يفضّل تسجيل baseline لـVercel قبل أي تحسين ثم مقارنة نفس المسارات بعده.

## 11. ملفات الأدلة المحلية

ملفات الأدلة والاختبارات موجودة خارج المشروع؛ لا تحتوي قيم مفاتيح خاصة أو محتويات صفوف عملاء:

- [اختبارات الاستغلال المعزولة](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/security-probes.cjs) و[نتائجها](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/security-probes-results.json).
- [نتائج HTTP الحية](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/live-readonly-results.json).
- [فحص JavaScript وHEAD لقاعدة البيانات](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/public-bundle-db-results.json).
- [تدقيق حزم الإنتاج الخام](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/npm-audit-production.json).
- [نتائج Lint](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/lint-results.json).
- [نتائج فحص تاريخ Git](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/history-secret-scan.json).
- [قياسات CPU المحلية](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/cpu-microbench-results.json) و[سكريبت القياس](C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/cpu-microbench.cjs).

إعادة تشغيل الاختبارات المعزولة فقط:

```powershell
node C:/Users/omaro/.codex/visualizations/2026/11/09/01a1c036-8433-7af2-8ac3-f186ca9aa879/security-probes.cjs
```

أي نتيجة `confirmed` في اختبارات نوع `vulnerability` تعني **تأكيد إعادة إنتاج السلوك غير الآمن**، وليست نجاح الموقع أمنيًا. الاختبارات لا تتصل بالشبكة، ولا تحمل `.env.local`، ولا تستخدم قاعدة بيانات أو Stripe أو بريدًا حقيقيًا.
