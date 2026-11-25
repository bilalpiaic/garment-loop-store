import { Forbidden, loadAdminPage } from "@/lib/admin-page";
import { listQuestionsForAdmin, listReviewsForAdmin } from "@/lib/platform";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { QuestionModeration } from "@/components/admin/question-moderation";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const access = await loadAdminPage("products.manage");
  if (access.forbidden) return <Forbidden />;
  const [reviews, questions] = await Promise.all([
    listReviewsForAdmin(),
    listQuestionsForAdmin(),
  ]);
  const pending = reviews.filter((review) => review.status === "pending").length;
  const pendingQuestions = questions.filter((item) => item.status === "pending").length;

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Merchandising</p>
        <h1 className="mt-1 font-serif text-3xl">Reviews & Q&A</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {pending} reviews pending · {pendingQuestions} questions pending
        </p>
      </div>
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Reviews</h2>
        <ReviewModeration reviews={reviews} />
      </section>
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Product Q&A</h2>
        <QuestionModeration questions={questions} />
      </section>
    </div>
  );
}
