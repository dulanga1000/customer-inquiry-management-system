"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginInput } from "@cims/shared";
import { BrandLogo } from "@/components/brand-logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiError } from "@/lib/apiClient";

export function LoginForm() {
  const router = useRouter();
  const { user, isLoading, login } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (!isLoading && user) {
      router.replace("/inquiries");
    }
  }, [isLoading, user, router]);

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    try {
      await login(values);
      router.replace("/inquiries");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields) {
          const fieldNames = Object.keys(error.fields) as Array<keyof LoginInput>;
          for (const field of fieldNames) {
            const msg = error.fields[field]?.[0];
            if (msg) {
              setError(field, { type: "server", message: msg });
            }
          }
          if (fieldNames[0]) {
            setFocus(fieldNames[0]);
          }
          return;
        }
        setServerError(error.message);
        return;
      }
      setServerError("Unable to sign in. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-[420px] space-y-6">
      <div className="flex items-center justify-between lg:justify-end">
        <BrandLogo size={30} className="lg:hidden" labelClassName="text-lg" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-950"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to overview
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Sign in</h1>
          <p className="text-sm text-zinc-600">
            Enter your work email and password to access{" "}
            <span className="font-semibold">
              <span className="text-slate-900">Case</span>
              <span className="text-blue-600">Box</span>
            </span>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          {serverError ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Sign-in failed</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-zinc-900">
              Work email
            </Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              className="h-10 bg-white"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
              {...register("email")}
            />
            {errors.email?.message ? (
              <p id="login-email-error" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-zinc-900">
              Password
            </Label>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-10 bg-white pr-10"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-zinc-400 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
            {errors.password?.message ? (
              <p id="login-password-error" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="mt-2 h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-xs text-zinc-500">
            Need an account? Contact your workspace administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
