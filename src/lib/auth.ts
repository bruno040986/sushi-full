import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

/**
 * Hash descartável usado quando o e-mail não existe. Sem isso, a resposta volta
 * na hora para e-mail inexistente e só demora quando existe — o que revela
 * quais e-mails estão cadastrados só pelo tempo de resposta.
 */
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.4bF3Ptr9WPKMwPtLRZuLBHF3mBpu";

/** Mensagem única: não distinguir "e-mail não existe" de "senha errada". */
const INVALID_CREDENTIALS = "E-mail ou senha inválidos";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Informe e-mail e senha");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        });

        const passwordMatches = await bcrypt.compare(
          credentials.password,
          user?.password ?? DUMMY_HASH,
        );

        if (!user || !passwordMatches) throw new Error(INVALID_CREDENTIALS);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/admin/login",
  },

  // JWT (sem adapter de banco) é o que permite o middleware rodar no Edge.
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
