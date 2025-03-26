
-- Create a view for user quiz statistics
CREATE OR REPLACE VIEW public.user_quiz_stats AS
SELECT
  user_id,
  COUNT(id) AS total_quizzes,
  SUM(total_questions) AS total_questions,
  SUM(score) AS total_correct_answers,
  CASE
    WHEN SUM(total_questions) > 0 THEN (SUM(score) * 100.0 / SUM(total_questions))
    ELSE 0
  END AS average_score,
  COUNT(DISTINCT book_id) AS books_studied,
  COUNT(DISTINCT chapter_id) AS chapters_studied,
  COUNT(DISTINCT paragraph_id) AS paragraphs_studied,
  MAX(created_at) AS last_quiz_date
FROM
  public.quiz_results
GROUP BY
  user_id;

-- Grant access to the view
GRANT SELECT ON public.user_quiz_stats TO authenticated;
GRANT SELECT ON public.user_quiz_stats TO anon;

-- Create RLS policy for the view
ALTER VIEW public.user_quiz_stats SECURITY INVOKER;
