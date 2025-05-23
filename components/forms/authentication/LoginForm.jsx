"use client";
import Button from "@/components/common/Button";
import Textfield from "@/components/common/Textfield";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { userLogin } from "@/api/authentication";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';
import { useState } from "react";

const LoginForm = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    
    const loginFormHandler = useFormik({
        initialValues: {
            email: "",
            password: "",
        },
        validateOnChange: false,
        validationSchema: Yup.object().shape({
            email: Yup.string().email("Email must be a valid email.").required("Email is required."),
            password: Yup.string().required("Password is required.")
        }),
        onSubmit: async (values, {setSubmitting, setErrors}) => {
            setSubmitting(true);
            setIsLoading(true);
            
            try {
                // Try server-side login first
                console.log("Attempting server-side login");
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(values),
                });
                
                const responseData = await response.json();
                
                if (response.ok && responseData.data && responseData.data.user) {
                    console.log("Server-side login successful");
                    Cookies.set('userDetails', JSON.stringify(responseData.data.user), { path: '/', expires: 1 });
                    Cookies.set('accessToken', responseData.data.token, { path: '/', expires: 1 });
                    toast.success("Login successful");
                    router.push("/dashboard");
                    return;
                } else {
                    console.error("Server-side login failed:", responseData.error);
                    // Continue to client-side login as fallback
                }
                
                // Fallback to client-side login
                console.log("Attempting client-side login");
                const resp = await userLogin(values);
                
                if (resp.error) {
                    console.error("Client-side login error:", resp.error);
                    
                    if (resp.error.includes("Invalid login credentials")) {
                        toast.error("Invalid email or password");
                        setErrors({
                            email: "Invalid credentials",
                            password: "Invalid credentials"
                        });
                    } else {
                        toast.error(resp.error || "Login failed");
                    }
                    return;
                }
                
                if (resp.data && resp.data.user) {
                    console.log("Client-side login successful");
                    Cookies.set('userDetails', JSON.stringify(resp.data.user), { path: '/', expires: 1 });
                    Cookies.set('accessToken', resp.data.token, { path: '/', expires: 1 });
                    toast.success("Login successful");
                    router.push("/dashboard");
                } else {
                    toast.error("Login failed. Please try again.");
                }
            } catch (error) {
                console.error("Login process error:", error);
                toast.error("An unexpected error occurred. Please try again.");
            } finally {
                setSubmitting(false);
                setIsLoading(false);
            }
        }
    });

    return (
        <div className="bg-white p-5 shadow w-1/4 rounded-lg">
            <p className="text-center font-semibold text-[30px] mb-3">LOGIN</p>
            <hr/>
            <form className="mt-2" onSubmit={loginFormHandler.handleSubmit}>
                <Textfield
                    name="email"
                    onChange={loginFormHandler.handleChange}
                    label="Email"
                    placeholder="enter email"
                    value={loginFormHandler.values.email}
                    error={loginFormHandler.errors.email}
                />
                <Textfield
                    name="password"
                    onChange={loginFormHandler.handleChange}
                    label="Password"
                    placeholder="enter password"
                    type="password"
                    value={loginFormHandler.values.password}
                    error={loginFormHandler.errors.password}
                />
                <Button
                    label="Sign in"
                    type="submit"
                    loading={isLoading || loginFormHandler.isSubmitting}
                />
            </form>
            <p className="text-[15px] text-slate-900 mt-4">
                Dont have an account? Click <Link href="/create-account" className="text-blue-500">here</Link>.
            </p>
        </div>
    );
};

export default LoginForm;
