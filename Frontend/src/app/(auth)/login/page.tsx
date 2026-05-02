import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

const LOGIN_SIDE_IMAGE_SRC = "/Auth/login-side-illustration.png";
const LOGIN_LOGO_SRC = "/Auth/login-logo.png";
const LOGIN_TREE_IMAGE_SRC = "/Auth/tree-img.png";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f2f2f8] [color-scheme:light]">
      <div className="flex min-h-screen">
        <section className="relative hidden overflow-hidden bg-[#f2f2f8] lg:flex lg:basis-[70%]">
          <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[#ececf6] [clip-path:polygon(0_35%,100%_0,100%_100%,0_100%)]" />

          <div className="absolute left-10 top-10 z-10 flex items-center gap-3">
            <Image src={LOGIN_LOGO_SRC} alt="Logo" width={34} height={34} className="h-[34px] w-[34px] object-contain" priority />
            <p className="text-[30px] font-bold leading-none text-violet-500  tracking-tight text-slate-900">LeadOrbit</p>
          </div>

          <Image
            src={LOGIN_SIDE_IMAGE_SRC}
            alt="Login illustration"
            fill
            priority
            className="z-[1] object-contain object-center px-10 py-24"
            sizes="(min-width: 1024px) 70vw, 0vw"
          />

          <Image
            src={LOGIN_TREE_IMAGE_SRC}
            alt="Decorative tree"
            width={132}
            height={250}
            className="pointer-events-none absolute bottom-0 left-10 z-[2] h-auto w-[88px] xl:w-[110px]"
            priority
          />
        </section>

        <section className="flex w-full items-center justify-center bg-white px-5 py-10 sm:px-8 lg:basis-[30%] lg:px-10 xl:px-12">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
