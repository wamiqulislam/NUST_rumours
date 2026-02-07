'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <SignUp 
        appearance={{
          variables: {
            colorPrimary: '#3b82f6',
            colorBackground: '#1e293b',
            colorText: '#ffffff',
            colorTextSecondary: '#cbd5e1',
          },
        }}
      />
    </div>
  );
}
