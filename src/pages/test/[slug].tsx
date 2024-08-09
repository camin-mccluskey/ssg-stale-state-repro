import { Quiz } from "@/components/Quiz";
import { useProblemHook } from "@/hooks/useProblemHook";
import Link from "next/link";
import { GetStaticProps, InferGetStaticPropsType } from "next/types";

export const getStaticPaths = () => {
  return {
    paths: [{ params: { slug: "CRM" } }, { params: { slug: "ATS" } }],
    fallback: false,
  };
};

export const getStaticProps = ((context) => {
  const { slug } = context.params ?? {};
  if (!slug || typeof slug !== "string") {
    return { notFound: true };
  }
  return {
    props: {
      slug,
    },
  };
}) satisfies GetStaticProps<{ slug: string }>;

export default function BrowsePage(
  props: InferGetStaticPropsType<typeof getStaticProps>,
) {
  const { name, onChangeName, onFinish } = useProblemHook(props.slug);
  return (
    <div className="w-full flex flex-col gap-4">
      <nav className="flex items-center gap-3">
        <Link href="/test/CRM">CRM</Link>
        <Link href="/test/ATS">ATS</Link>
      </nav>
      <Quiz name={name} onChangeName={onChangeName} onFinish={onFinish} />
    </div>
  );
}
