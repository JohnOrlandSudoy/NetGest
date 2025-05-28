"use client";
import Link from "next/link";

export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        
        <p className="mb-4 text-gray-700">
          There was a problem with the authentication process. This could be due to:
        </p>
        
        <ul className="list-disc pl-5 mb-6 text-gray-700">
          <li>An invalid or expired confirmation link</li>
          <li>An account that has already been confirmed</li>
          <li>A technical issue with the authentication service</li>
        </ul>
        
        <div className="flex flex-col space-y-3">
          <Link 
            href="/" 
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-center"
          >
            Return to Login
          </Link>
          
          <Link 
            href="/create-account" 
            className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 text-center"
          >
            Create a New Account
          </Link>
        </div>
      </div>
    </div>
  );
}

