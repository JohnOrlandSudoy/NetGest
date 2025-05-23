"use client";
import Button from "@/components/common/Button";
import Textfield from "@/components/common/Textfield";
import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { userRegistraion } from "@/api/authentication";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';

const RegistrationForm = () => {
    const router = useRouter();
    const registrationFormHandler = useFormik({
        initialValues: {
            email: "",
            password: "",
            name: "",
        },
        validateOnChange: false,
        validationSchema: Yup.object().shape({
            email: Yup.string().email("Email must be a valid email.").required("Email is required."),
            password: Yup.string().required("Password is required.").min(8, "Password must be at least 8 characters"),
            name: Yup.string().required("Name is required."),
        }),
        onSubmit: async (values, {setSubmitting, setErrors, resetForm}) => {
            setSubmitting(true);
            
            try {
                // Try the server-side registration first
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(values),
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || "Registration failed");
                }
                
                // With email confirmation disabled, the user should be automatically logged in
                // Check if we have a session
                if (result.data && result.data.session) {
                    // Store user details and token
                    Cookies.set('userDetails', JSON.stringify(result.data.user), { path: '/', expires: 1 });
                    Cookies.set('accessToken', result.data.session.access_token, { path: '/', expires: 1 });
                    
                    toast.success("Account registered successfully. You are now logged in.");
                    resetForm();
                    router.push("/dashboard");
                } else {
                    // If no session, show success but redirect to login
                    toast.success("Account registered successfully. Please log in.");
                    resetForm();
                    router.push("/");
                }
            } catch (error) {
                console.error("Registration error:", error);
                
                // Fallback to client-side registration if server-side fails
                try {
                    const resp = await userRegistraion(values);
                    
                    if (resp.error) {
                        toast.error(resp.error);
                        return;
                    }
                    
                    if (resp.data) {
                        // Check if we have a session
                        if (resp.data.session) {
                            // Store user details and token
                            Cookies.set('userDetails', JSON.stringify(resp.data.user), { path: '/', expires: 1 });
                            Cookies.set('accessToken', resp.data.session.access_token, { path: '/', expires: 1 });
                            
                            toast.success("Account registered successfully. You are now logged in.");
                            resetForm();
                            router.push("/dashboard");
                        } else {
                            toast.success("Account registered successfully. Please log in.");
                            resetForm();
                            router.push("/");
                        }
                    } else {
                        toast.error("Account registration failed.");
                    }
                } catch (fallbackError) {
                    toast.error("Registration failed. Please try again later.");
                }
            } finally {
                setSubmitting(false);
            }
        }
    });

    return (
        <div className="bg-white p-5 shadow w-1/4 rounded-lg">
            <p className="text-center font-semibold text-[30px] mb-3">Create an account</p>
            <hr/>
            <form className="mt-2" onSubmit={registrationFormHandler.handleSubmit}>
                <Textfield
                    name="name"
                    onChange={registrationFormHandler.handleChange}
                    label="Name"
                    placeholder="enter name"
                    value={registrationFormHandler.values.name}
                    error={registrationFormHandler.errors.name}
                />
                <Textfield
                    name="email"
                    onChange={registrationFormHandler.handleChange}
                    label="Email"
                    placeholder="enter email"
                    value={registrationFormHandler.values.email}
                    error={registrationFormHandler.errors.email}
                />
                <Textfield
                    name="password"
                    onChange={registrationFormHandler.handleChange}
                    label="Password"
                    placeholder="enter password"
                    type="password"
                    value={registrationFormHandler.values.password}
                    error={registrationFormHandler.errors.password}
                />
                <Button
                    label="Sign up"
                    type="submit"
                    loading={registrationFormHandler.isSubmitting}
                />
            </form>
            <p className="text-[15px] text-slate-900">
                Already have an account? Login <Link href="/" className="text-blue-500">here</Link>.
            </p>
        </div>
    );
};

export default RegistrationForm;
