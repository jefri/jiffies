import {
  a,
  div,
  figure,
  h1,
  h2,
  header,
  img,
  li,
  main,
  nav,
  p,
  section,
  span,
  ul,
} from "../../jiffies/dom/html";
import * as ResumeTypes from "./type";

export const Resume = (resume: ResumeTypes.ResumeData) =>
  main(
    jobDetails(resume.experience.jobs),
    studies(resume.knowledge.studies ?? []),
    projects(resume.experience.projects)
  );

export const AboutMe = (
  // {
  //     profile: { name, surnames, title, avatar, location },
  //     relevantLinks,
  //   },
  // }:
  aboutMe: ResumeTypes.AboutMe
) => [
  h1(`${aboutMe.profile.name} ${aboutMe.profile.surnames ?? ""} - Resume`),
  h2(aboutMe.profile.title),
  ...(aboutMe.profile.avatar ? [Avatar(aboutMe.profile.avatar)] : []),
  ...(aboutMe.profile.location ? [Location(aboutMe.profile.location)] : []),
  ...((aboutMe.relevantLinks ?? []).length == 0
    ? []
    : [Links(aboutMe.relevantLinks ?? [])]),
];

const Avatar = (avatar: ResumeTypes.Image) =>
  figure(
    img({
      src: (avatar as ResumeTypes.ImageLink).link
        ? (avatar as ResumeTypes.ImageLink).link
        : `data:${(avatar as ResumeTypes.ImageData).mediaType};base64,${
            (avatar as ResumeTypes.ImageData).data
          }`,
    })
  );

const Location = (location: ResumeTypes.Location) =>
  div(
    ...Object.entries(location).map(([k, v]) =>
      span({ class: `location ${k}` }, v)
    )
  );

const Links = (relevantLinks: ResumeTypes.Link[]) =>
  nav(ul(...relevantLinks.map((link) => li(a({ href: link.URL }, link.type)))));

const jobDetails = (jobs: ResumeTypes.JobExperience[]) =>
  section(header("Work Experience"), ...jobs.map(jobDetail));

const jobDetail = (job: ResumeTypes.JobExperience) =>
  div(organization(job.organization), ...job.roles.map(role));

const organization = (org: ResumeTypes.PublicEntityDetails) =>
  div(org.URL ? a({ href: org.URL }, org.name) : org.name);

const role = (role: ResumeTypes.Role) =>
  div(
    { class: "role" },
    div(
      { class: "about" },
      span({ class: "name" }, role.name),
      span({ class: "start" }, role.startDate),
      ...(role.finishDate ? [span({ class: "finish" }, role.finishDate)] : [])
    ),
    div(
      { class: "details" },
      ...role.challenges.map(({ description }) => p(description))
    ),
    div(
      { class: "competences" },
      ...(role.competences ?? []).map(({ name }) => name).join(", ")
    )
  );

const studies = (knowledge: ResumeTypes.Study[]) =>
  section(header("Education"), ...knowledge.map(education));

const education = (study: ResumeTypes.Study) =>
  div(
    { class: "education" },
    div(
      { class: "institution" },
      ...(study.institution ? [organization(study.institution)] : [])
    ),
    div(
      { class: "about" },
      span({ class: "name" }, study.name),
      span({ class: "start" }, study.startDate),
      ...(study.finishDate ? [span({ class: "finish" }, study.finishDate)] : [])
    ),
    div({ class: "description" }, study.description ?? "")
  );

const projects = (projects: ResumeTypes.ProjectExperience[]) =>
  section(header("Projects"), ...projects.map(projectDetail).flat());

const projectDetail = ({ details }: ResumeTypes.ProjectExperience) =>
  details
    ? div(
        { class: "project" },
        span(
          details.URL ? a({ href: details.URL }, details.name) : details.name
        ),
        ...(details.description ? [p(details.description)] : [])
      )
    : [];
