import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ReadyForReviewComponent } from './components/ready-for-review/ready-for-review.component';
import { InvoiceFormComponent } from './components/invoice-form/invoice-form.component';
import { UploadsComponent } from './pages/uploads/uploads.component';
import { ReadyPostCardsComponent } from './components/ready-post-cards/ready-post-cards.component';
import { AccuracyOfInvoiceProcessComponent } from './components/accuracy-of-invoice-process/accuracy-of-invoice-process.component';
import { VendorNameComponent } from './components/vendor-name/vendor-name.component';
import { ErrorComponent } from './components/error/error.component';
import { UploadFileComponent } from './components/upload-file/upload-file.component';

import { AuthGuard } from './guards/auth.guard';
import { SettingsComponent } from './pages/settings/settings.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { VendorSettingsComponent } from './components/vendor-settings/vendor-settings.component';
import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { XmlMappingComponent } from './components/xml-mapping/xml-mapping.component';
import { ProfileDetailsComponent } from './components/profile-details/profile-details.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { ForbiddenComponent } from './pages/forbidden/forbidden.component';
import { SignupComponent } from './components/signup/signup.component';
import { ThankyouComponent } from './components/thankyou/thankyou.component';
import { CheckEmailComponent } from './components/check-email/check-email.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { FaqComponent } from './components/faq/faq.component';
import { ManuallyCorrectedDocListComponent } from './components/extraction-assist/FormatIdentifier/manuallyCorrected-doclist/manuallyCorrected-doclist.component';
import { FieldSelectionComponent } from './components/extraction-assist/FormatIdentifier/field-selection/field-selectioncomponent';
import { RuleMasterdataSuggestionComponent } from './components/extraction-assist/FormatIdentifier/rule-masterdata-suggestion/rule-masterdata-suggestion.component';
import { RuleMasterdataCreationComponent } from './components/extraction-assist/FormatIdentifier/rule-masterdata-creation/rule-masterdata-creation.component';
import { ExtractionAssistRootComponent } from './components/extraction-assist/extraction-assist-root.component';
import { DashboardNewComponent } from './pages/dashboard-new/dashboard-new.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '403-forbidden', component: ForbiddenComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'thankyou', component: ThankyouComponent },
  { path: 'forgot-password', component: CheckEmailComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'authentication/verifyEmail', component: EmailVerificationComponent },
  {
    path: 'dashboard',
    component: DashboardNewComponent,//DashboardComponent
    canActivate: [AuthGuard],
  },
  {
    path: 'faq',
    component: FaqComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'ready-for-review',
    component: ReadyForReviewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'ready-for-review/:rowId',
    component: ReadyForReviewComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'invoice-form',
    component: InvoiceFormComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'vendors',
        component: VendorSettingsComponent
      },
      { path: 'users', component: UserSettingsComponent },
      { path: 'xmlMapping', component: XmlMappingComponent },
      // { path: 'createRules', component: RuleCreationComponent }
    ]
  },
  {
    path: 'extraction-assitance',
    //component: ExtractionAssistRootComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        component: ExtractionAssistRootComponent
      },
      {
        path: 'mastredata-suggestion',
        component: RuleMasterdataSuggestionComponent
      },
      {
        path: 'mastredata-create',
        component: RuleMasterdataCreationComponent
      },
      {
        path: 'mastredata-approve',
        component: RuleMasterdataCreationComponent
      }
    ]
  },

  {
    path: 'extraction-assist',
    component: ManuallyCorrectedDocListComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'details', pathMatch: 'full' },
      {
        path: 'details',
        component: ProfileDetailsComponent
      },
      { path: 'change-password', component: ChangePasswordComponent }
    ]
  },
  {
    path: 'processing',
    component: UploadsComponent,
    canActivate: [AuthGuard]
  },
  { path: 'uploadFile', component: UploadFileComponent },
  { path: 'ready-post-card', component: ReadyPostCardsComponent },
  {
    path: 'accuracy-invoice-process',
    component: AccuracyOfInvoiceProcessComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'vendor-name',
    component: VendorNameComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', component: ErrorComponent }
];

@NgModule({
  declarations: [],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
