pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    REGISTRY       = 'registry.lpj.app'
    IMAGE          = 'registry.lpj.app/myverein/website'
    MANIFESTS_REPO = 'https://github.com/LPJ-IT-Solutions/kubernetes-manifests.git'
  }

  stages {
    stage('Prepare') {
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        checkout scm
        script {
          def sha = sh(returnStdout: true, script: 'git rev-parse --short=12 HEAD').trim()
          if (env.BRANCH_NAME == 'main') {
            env.TARGET  = 'prod'
            env.TAG     = sha
            env.OVERLAY = 'myverein/overlays/prod'
            env.API_URL = 'https://api.myverein.lpj.app'
          } else {
            env.TARGET  = 'dev'
            env.TAG     = "dev-${sha}"
            env.OVERLAY = 'myverein/overlays/test'
            env.API_URL = 'https://testapi.myverein.lpj.app'
          }
          echo "branch=${env.BRANCH_NAME} target=${env.TARGET} tag=${env.TAG}"
        }
      }
    }

    stage('Build') {
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        sh 'podman build -t website-base -f Dockerfile.base .'
        sh '''
          podman build \
            --build-arg NEXT_PUBLIC_BACKEND_URL="$API_URL" \
            -t "$IMAGE:$TAG" -f Dockerfile.website .
        '''
      }
    }

    stage('Push') {
      when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'harbor-myverein-ci-push',
                                          usernameVariable: 'HUSER', passwordVariable: 'HPASS')]) {
          sh '''
            set -eu
            echo "$HPASS" | podman login "$REGISTRY" -u "$HUSER" --password-stdin
            podman push "$IMAGE:$TAG"
            podman logout "$REGISTRY"
          '''
        }
      }
    }

    stage('Deploy') {
      // Dev environment is not live yet: only main (prod) is deployed.
      // To roll out staging to overlays/test, use the lower when line instead.
      when { branch 'main' }
      // when { anyOf { branch 'staging'; branch 'main' } }
      steps {
        withCredentials([usernamePassword(credentialsId: 'github-app-lpj-jenkins-ci',
                                          usernameVariable: 'GH_APP', passwordVariable: 'GH_TOKEN')]) {
          sh '''
            set -eu
            export GIT_CONFIG_COUNT=1
            export GIT_CONFIG_KEY_0=http.extraheader
            export GIT_CONFIG_VALUE_0="Authorization: Basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)"
            rm -rf manifests
            git clone --depth 1 --branch main "$MANIFESTS_REPO" manifests
            cd manifests
            git config user.name  "jenkins-ci"
            git config user.email "ci@lpj.app"
            (cd "$OVERLAY" && kustomize edit set image "$IMAGE:$TAG")
            git add "$OVERLAY/kustomization.yaml"
            git diff --cached --quiet && { echo "nothing to bump"; exit 0; }
            git commit -m "myverein($TARGET): website $TAG"
            for i in 1 2 3; do
              git push origin main && exit 0
              git pull --rebase origin main
            done
            exit 1
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'podman image prune -f || true'
      deleteDir()
    }
  }
}