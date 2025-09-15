// src/services/TrialService.ts
import { User } from "../models/User";

type StartTrialOpts = {
    months?: number;               // default: 6
    source?: string;               // "domain_claim" | "admin_approved_claim" | ...
};

export async function startStartupTrialIfEligible(
    userId: string,
    { months = 6, source = "company_claim" }: StartTrialOpts = {}
) {
    const user = await User.findById(userId);
    if (!user) return { applied: false, reason: "USER_NOT_FOUND" };

    const now = new Date();

    // 1) Zaten aktif/trial bir üyelik varsa dokunma
    const hasActiveOrTrial =
        (user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial") &&
        user.nextPaymentDate &&
        new Date(user.nextPaymentDate) > now;

    if (hasActiveOrTrial) {
        return { applied: false, reason: "ALREADY_SUBSCRIBED" };
    }

    // 2) Daha önce claim trial verilmiş mi? (idempotency)
    const alreadyClaimTrial = (user.paymentHistory || []).some(
        (h: any) => typeof h.description === "string" && h.description.includes("[CLAIM_TRIAL]")
    );
    if (alreadyClaimTrial) {
        return { applied: false, reason: "ALREADY_GOT_CLAIM_TRIAL" };
    }

    // 3) Trial uygula (Startup/Monthly)
    user.subscriptionPlan = "startup";
    user.subscriptionPeriod = "monthly";
    user.subscriptionStatus = "trial";
    user.isSubscriptionActive = true;
    user.subscriptionStartDate = now;

    const trialEnd = new Date(now);
    trialEnd.setMonth(trialEnd.getMonth() + Number(months));
    user.trialEndsAt = trialEnd;
    user.nextPaymentDate = trialEnd;
    user.lastPaymentDate = now;

    // 4) Payment history (idempotency marker)
    if (!user.paymentHistory) user.paymentHistory = [];
    user.paymentHistory.push({
        amount: 0,
        date: now,
        status: "success",
        transactionId: `trial-claim-${Date.now()}`,
        description: `[CLAIM_TRIAL] ${months} aylık ücretsiz Startup denemesi (${source})`,
        plan: "startup",
        period: "monthly",
    });

    // 5) Subscriptions kaydı
    if (!user.subscriptions) user.subscriptions = [];
    user.subscriptions.push({
        plan: "startup",
        period: "monthly",
        status: "trial",
        startDate: now,
        endDate: trialEnd,
        amount: 0,
        autoRenewal: true,
        // şemanız ödeme yöntemi alanını zorluyorsa "creditCard" bırakabilirsiniz
        paymentMethod: "creditCard" as const,
        lastPaymentDate: now,
        nextPaymentDate: trialEnd,
        transactionId: `trial-claim-${Date.now()}-${user._id}`,
        revenueCatProductId: "startup_monthly",
        isActive: true,
    });

    await user.save();
    return { applied: true };
}
