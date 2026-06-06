"use client";

import { createAuthClient } from "better-auth/react";

// baseURL は同一オリジンなので省略（現在のオリジンを使用）
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
