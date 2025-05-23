"use client";

import { editProfile, changePassword } from "@/api/authentication";
import Button from "@/components/common/Button";
import Textfield from "@/components/common/Textfield";
import Authenticated from "@/components/layouts/Authenticated";
import { useFormik } from "formik";
import { toast  } from 'react-toastify';
import * as Yup from "yup";

const EditProfilePage = () => {

    const handleEditProfile = useFormik({
        initialValues: {
            name: "",
            email: ""
        },
        validateOnChange: false,
        validationSchema: Yup.object().shape({
            name: Yup.string().required("Name is required"),
            email: Yup.string().required("Email is required").email("Should be a valid email"),
        }),
        onSubmit: (values, {setSubmitting, resetForm} ) => {
            setSubmitting(true);

            editProfile(values)
            .then((resp) => {
                const responseData = resp.data;
                if (!responseData.data.error) {
                    toast.success("Profile updated successfully.");
                    resetForm();
                } else {
                    toast.error("Updating profile failed.");
                }
            }).finally(() => {
                setSubmitting(false);
            })
        }
    });

    const handlePasswordChange = useFormik({
        initialValues: {
            oldPassword: "",
            newPassword: "",
        },
        validateOnChange: false,
        validationSchema: Yup.object().shape({
            oldPassword: Yup.string().required("Current password is required"),
            newPassword: Yup.string().required("New password is required")
                .min(8, "New password must be at least 8 characters"),
        }),
        onSubmit: (values, {setSubmitting, resetForm, setErrors} ) => {
            setSubmitting(true);

            changePassword(values)
            .then((resp) => {
                const responseData = resp.data.data;
                if (!responseData.data.error) {
                    toast.success("Password updated successfully.");
                    resetForm();
                }
            }).catch((errs) => {
                setErrors({
                    oldPassword: "Current password is incorrect"
                });
            }).finally(() => {
                setSubmitting(false);
            })
        }
    });
    return (
        <Authenticated
            title="Edit Profile"
        >
            <div className="rounded bg-white p-5 w-2/6">
                <p className="text-[20px]">Edit Profile</p>
                <br/>
                <form onSubmit={handleEditProfile.handleSubmit}>
                    <Textfield
                        name="name"
                        label="Name"
                        value={handleEditProfile.values.name}
                        error={handleEditProfile.errors.name}
                        onChange={handleEditProfile.handleChange}
                    />

                    <Textfield
                        name="email"
                        label="Email"
                        value={handleEditProfile.values.email}
                        error={handleEditProfile.errors.email}
                        onChange={handleEditProfile.handleChange}
                    />

                    <Button
                        type="submit"
                        label="Save Changes"
                        loading={handleEditProfile.isSubmitting}
                    />
                </form>
            </div>
            <br/>
            <div className="rounded bg-white p-5 w-2/6">
                <p className="text-[20px]">Change Password</p>
                <br/>
                <form onSubmit={handlePasswordChange.handleSubmit}>
                    <Textfield
                        name="oldPassword"
                        label="Current Password"
                        value={handlePasswordChange.values.oldPassword}
                        error={handlePasswordChange.errors.oldPassword}
                        type="password"
                        onChange={handlePasswordChange.handleChange}
                    />

                    <Textfield
                        name="newPassword"
                        label="New Password"
                        value={handlePasswordChange.values.newPassword}
                        error={handlePasswordChange.errors.newPassword}
                        type="password"
                        onChange={handlePasswordChange.handleChange}
                    />

                    <Button
                        type="submit"
                        label="Save Changes"
                        loading={handlePasswordChange.isSubmitting}
                    />
                </form>
            </div>
        </Authenticated>
    );
};

export default EditProfilePage;
