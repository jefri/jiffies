import { compileFStyle } from "../../jiffies/dom/css/fstyle.js";
import {
  a,
  article,
  div,
  em,
  figure,
  h1,
  h2,
  h3,
  h4,
  header,
  hgroup,
  img,
  li,
  nav,
  p,
  section,
  small,
  span,
  style,
  ul,
} from "../../jiffies/dom/html.js";
import * as ResumeTypes from "./type.js";

export const Resume = (resume: ResumeTypes.ResumeData) => [
  style(
    compileFStyle({
      body: {
        marginTop: "var(--block-spacing-vertical)",
      },
      "article > header > h3": {
        marginBottom: "0",
      },
      ".organization": {
        gridArea: "org",
        marginBottom: "0",
        borderBottom: "thin solid var(--card-border-color)",
      },
      ".role, .education, .project": {
        display: "contents",
      },
      ".job, .education": {
        display: "grid",
        grid: `'_a org _b' auto
               'about details competences' auto
               / 1fr 4fr 1fr`,
        gap: "calc(var(--block-spacing-vertical) / 2) calc(var(--block-spacing-horizontal) / 2)",
      },
      ".about": {
        gridArea: "about",
        display: "flex",
        flexDirection: "column",
      },
      ".details": {
        gridArea: "details",
      },
      ".competences": {
        gridArea: "competences",
      },
    })
  ),
  jobDetails(resume.experience.jobs),
  studies(resume.knowledge.studies ?? []),
  projects(resume.experience.projects),
  publications(resume.experience.publicArtifacts),
];

export const AboutMe = (
  // {
  //     profile: { name, surnames, title, avatar, location },
  //     relevantLinks,
  //   },
  // }:
  aboutMe: ResumeTypes.AboutMe
) => [
  style(
    compileFStyle({
      "body > header": {
        display: "grid",
        grid: `'avatar name links' auto
               'avatar title links' auto
               'avatar location links' auto
                  / 150px auto`,
        gap: "0 var(--block-spacing-horizontal)",
        hgroup: {
          display: "contents",
        },
        h1: {
          gridArea: "name",
        },
        h2: {
          gridArea: "title",
        },
        figure: {
          gridArea: "avatar",
          margin: "0",
          img: {
            borderRadius: "10%",
          },
        },
        "div.location": {
          gridArea: "location",
          display: "flex",
          flexDirection: "row-reverse",
          justifyContent: "flex-end",
          gap: "0.25em",
          "span:not(:first-child)::after": {
            content: "','",
          },
        },
        nav: {
          gridArea: "links",
          flexDirection: "row-reverse",
          ul: {
            flexDirection: "column",
          },
        },
      },
    })
  ),
  hgroup(
    h1(`${aboutMe.profile.name} ${aboutMe.profile.surnames ?? ""}`),
    h2(aboutMe.profile.title)
  ),
  ...(aboutMe.profile.avatar ? [Avatar(aboutMe.profile.avatar)] : []),
  ...(aboutMe.profile.location ? [Location(aboutMe.profile.location)] : []),
  ...((aboutMe.relevantLinks ?? []).length == 0
    ? []
    : [Links(aboutMe.relevantLinks ?? [])]),
];

const Avatar = (avatar: ResumeTypes.Image) =>
  figure(
    img({
      height: 136,
      width: 136,
      src: (avatar as ResumeTypes.ImageLink).link
        ? (avatar as ResumeTypes.ImageLink).link
        : `data:${(avatar as ResumeTypes.ImageData).mediaType};base64,${
            (avatar as ResumeTypes.ImageData).data
          }`,
    })
  );

const Location = (location: ResumeTypes.Location) =>
  div(
    { class: "location" },
    ...Object.entries(location).map(([k, v]) =>
      span({ class: `location ${k}` }, v)
    )
  );

const Links = (relevantLinks: ResumeTypes.Link[]) =>
  nav(
    ul(
      ...relevantLinks.map((link) =>
        li(
          a(
            { href: link.URL },
            span({ class: "no-print" }, link.type),
            span({ class: "print-only" }, link.URL)
          )
        )
      )
    )
  );

const jobDetails = (jobs: ResumeTypes.JobExperience[]) =>
  article(header(h3("Work Experience")), ...jobs.map(jobDetail));

const jobDetail = (job: ResumeTypes.JobExperience) =>
  div({ class: "job" }, organization(job.organization), ...job.roles.map(role));

const organization = (org: ResumeTypes.PublicEntityDetails) =>
  h4(
    { class: "organization" },
    org.URL ? a({ href: org.URL }, org.name) : org.name
  );

const role = (role: ResumeTypes.Role) =>
  div(
    { class: "role" },
    div(
      { class: "about" },
      em({ class: "name" }, role.name),
      small({ class: "start date" }, role.startDate),
      ...(role.finishDate
        ? [small({ class: "finish date" }, role.finishDate)]
        : [])
    ),
    div(
      { class: "details" },
      ...role.challenges.map(({ description }) =>
        p({ class: "justify" }, description)
      )
    ),
    div(
      { class: "competences" },
      small((role.competences ?? []).map(({ name }) => name).join(", "))
    )
  );

const studies = (knowledge: ResumeTypes.Study[]) =>
  article(header(h3("Education")), ...knowledge.map(education));

const education = (study: ResumeTypes.Study) =>
  div(
    { class: "education" },
    h4(
      { class: "organization" },
      ...(study.institution ? [organization(study.institution)] : [])
    ),
    div(
      { class: "about" },
      em({ class: "name" }, study.name),
      small({ class: "start" }, study.startDate),
      ...(study.finishDate
        ? [small({ class: "finish" }, study.finishDate)]
        : [])
    ),
    p({ class: "details justify" }, study.description ?? "")
  );

const projects = (projects: ResumeTypes.ProjectExperience[]) =>
  article(header(h3("Projects")), ...projects.map(projectDetail).flat());

const publications = (artifacts: ResumeTypes.PublicArtifact[]) =>
  article(
    { class: "publications" },
    style(
      compileFStyle({
        ".publications section": {
          columns: "2",
          marginBottom: "0",
          p: {
            display: "grid",
            grid: "fit-content(0) / 3fr minmax(fit-content, 1fr);",
            gap: "0 calc(var(--block-spacing-vertical) / 2)",
            marginBottom: "0",
          },
        },
      })
    ),
    header(h3("publications")),
    section(
      ...artifacts
        .filter(({ details: { URL } }) => URL != undefined)
        .map(publication)

        .flat()
    )
  );

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

const publication = ({
  details: { name, URL },
  publishingDate,
}: ResumeTypes.PublicArtifact) =>
  p(
    a({ href: URL }, name),
    span({ class: "print-only" }, URL ?? ""),
    small(em(publishingDate))
  );
